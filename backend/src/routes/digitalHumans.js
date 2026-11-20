const fs = require('fs');
const express = require('express');
const { eq, desc } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs, parseJsonObject, stringifyJson } = require('../db/helpers');
const { requireAdmin } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const { uploadDigitalHumanFiles } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime } = require('../utils/url');
const { inspectGlbFile } = require('../utils/glb');
const { deleteUploadByUrl, deleteUploadedFiles } = require('../utils/uploadFiles');

const router = express.Router();
const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function readBool(value) {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

function normalizeColor(value, fallback) {
  const s = String(value || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(s)) return s.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return ('#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3]).toLowerCase();
  }
  return fallback || '#f3ebe0';
}

function parseBackgroundType(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (value === 'color' || value === 'image') return value;
  throw httpError(400, '背景类型无效');
}

function uploadedPath(files, field, subdir) {
  const file = files && files[field] && files[field][0];
  return file ? '/uploads/' + subdir + '/' + file.filename : '';
}

function validateImageSizes(files) {
  const checks = [
    ['backgroundImage', '背景图'],
    ['thumbnail', '缩略图']
  ];
  checks.forEach(function (pair) {
    const file = files && files[pair[0]] && files[pair[0]][0];
    if (file && file.size > MAX_IMAGE_BYTES) {
      throw httpError(400, pair[1] + '不能超过 8MB');
    }
  });
}

function inspectUploadedGlb(file) {
  let info;
  try {
    info = inspectGlbFile(file.path);
  } catch (e) {
    throw httpError(400, (e && e.message) || 'GLB 校验失败');
  }
  if (!info.compatible) {
    throw httpError(
      400,
      '骨骼不兼容，缺少：' +
        info.missing.join('、') +
        '。请使用 Mixamo 命名（允许 mixamorig: 前缀）'
    );
  }
  return info;
}

function mapRow(row, adminMode) {
  if (!row) return null;
  const out = {
    id: row.id,
    name: row.name,
    gender: row.gender === 'male' ? 'male' : 'female',
    glbUrl: row.glbUrl,
    thumbnail: row.thumbnail || '',
    background: {
      type: row.backgroundType === 'image' ? 'image' : 'color',
      color: row.backgroundColor || '#f3ebe0',
      image: row.backgroundImage || ''
    },
    updatedAt: formatDateTime(row.updatedAt)
  };
  if (adminMode) {
    out.enabled = readBool(row.enabled);
    out.rigInfo = parseJsonObject(row.rigInfo);
    out.sortOrder = row.sortOrder || 0;
    out.createdAt = formatDateTime(row.createdAt);
  }
  return out;
}

async function getActiveRow() {
  const { digitalHumans } = dbm.schema;
  const rows = await dbm.db
    .select()
    .from(digitalHumans)
    .where(eq(digitalHumans.enabled, true))
    .orderBy(desc(digitalHumans.updatedAt))
    .limit(1);
  return rows[0] || null;
}

async function getRow(id) {
  const { digitalHumans } = dbm.schema;
  const rows = await dbm.db
    .select()
    .from(digitalHumans)
    .where(eq(digitalHumans.id, id))
    .limit(1);
  return rows[0] || null;
}

/** 单活启用：先停用全部，再启用目标。配合迁移里的 partial unique index。 */
async function activateOnly(id) {
  const { digitalHumans } = dbm.schema;
  const now = nowMs();
  await dbm.db
    .update(digitalHumans)
    .set({ enabled: false, updatedAt: now })
    .where(eq(digitalHumans.enabled, true));
  await dbm.db
    .update(digitalHumans)
    .set({ enabled: true, updatedAt: now })
    .where(eq(digitalHumans.id, id));
}

function uploadMiddleware(req, res, next) {
  uploadDigitalHumanFiles(req, res, function (err) {
    if (err) {
      deleteUploadedFiles(req.files);
      return res.status(400).json({ ok: false, message: err.message || '上传失败' });
    }
    next();
  });
}

/** GET /api/digital-humans/active — 前端只读取当前启用项 */
router.get(
  '/active',
  asyncHandler(async function (_req, res) {
    res.set('Cache-Control', 'no-store');
    if (!dbm.isDbReady()) {
      return res.json({ ok: true, data: null });
    }
    try {
      const row = await getActiveRow();
      res.json({ ok: true, data: row ? mapRow(row, false) : null });
    } catch (e) {
      console.warn('[digitalHumans] active failed:', e.message);
      res.json({ ok: true, data: null });
    }
  })
);

/** GET /api/admin/digital-humans — 列表 */
admin.get(
  '/',
  asyncHandler(async function (_req, res) {
    const { digitalHumans } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(digitalHumans)
      .orderBy(desc(digitalHumans.sortOrder), desc(digitalHumans.updatedAt));
    res.json({ ok: true, data: { list: rows.map(function (row) { return mapRow(row, true); }) } });
  })
);

/** POST /api/admin/digital-humans — 新增 */
admin.post(
  '/',
  uploadMiddleware,
  asyncHandler(async function (req, res) {
    const { digitalHumans } = dbm.schema;
    const body = req.body || {};
    const files = req.files || {};
    let insertedId = '';
    try {
      const name = String(body.name || '').trim();
      if (!name) throw httpError(400, '请填写数字人名称');
      if (name.length > 40) throw httpError(400, '数字人名称最多 40 字');

      const gender = body.gender === 'male' ? 'male' : body.gender === 'female' ? 'female' : '';
      if (!gender) throw httpError(400, '请选择性别');

      const backgroundType = parseBackgroundType(body.backgroundType, 'color');
      const backgroundColor = normalizeColor(body.backgroundColor, '#f3ebe0');

      const glbFile = files.glb && files.glb[0];
      if (!glbFile) throw httpError(400, '请上传 GLB 模型文件');

      validateImageSizes(files);
      const inspection = inspectUploadedGlb(glbFile);

      let backgroundImage = '';
      if (backgroundType === 'image') {
        backgroundImage = uploadedPath(files, 'backgroundImage', 'digital-humans/backgrounds');
        if (!backgroundImage) throw httpError(400, '图片背景请上传背景图');
      } else if (files.backgroundImage && files.backgroundImage[0]) {
        // 纯色模式不保留多余背景图，避免孤儿文件
        try {
          fs.unlinkSync(files.backgroundImage[0].path);
        } catch (e) {
          /* ignore */
        }
      }

      const thumbnail = uploadedPath(files, 'thumbnail', 'digital-humans/thumbs');
      const now = nowMs();
      const row = {
        id: newId(),
        name: name,
        gender: gender,
        glbUrl: '/uploads/digital-humans/' + glbFile.filename,
        thumbnail: thumbnail,
        backgroundType: backgroundType,
        backgroundColor: backgroundColor,
        backgroundImage: backgroundImage,
        enabled: false,
        rigInfo: stringifyJson({
          boneCount: inspection.boneCount,
          compatible: inspection.compatible,
          missing: inspection.missing
        }),
        sortOrder: parseInt(body.sortOrder, 10) || 0,
        createdAt: now,
        updatedAt: now
      };

      await dbm.db.insert(digitalHumans).values(row);
      insertedId = row.id;

      if (readBool(body.enabled)) {
        await activateOnly(row.id);
        row.enabled = true;
      }

      res.status(201).json({ ok: true, data: mapRow(row, true) });
    } catch (e) {
      if (insertedId) {
        try {
          await dbm.db.delete(digitalHumans).where(eq(digitalHumans.id, insertedId));
        } catch (cleanupErr) {
          console.warn('[digitalHumans] create rollback failed:', cleanupErr.message);
        }
      }
      deleteUploadedFiles(files);
      if (e && e.status) return res.status(e.status).json({ ok: false, message: e.message });
      throw e;
    }
  })
);

/** PUT /api/admin/digital-humans/:id — 编辑 */
admin.put(
  '/:id',
  uploadMiddleware,
  asyncHandler(async function (req, res) {
    const { digitalHumans } = dbm.schema;
    const doc = await getRow(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '数字人不存在' });

    const body = req.body || {};
    const files = req.files || {};
    let dbUpdated = false;

    try {
      validateImageSizes(files);
      const patch = { updatedAt: nowMs() };

      if (body.name !== undefined) {
        const name = String(body.name || '').trim();
        if (!name) throw httpError(400, '数字人名称不能为空');
        if (name.length > 40) throw httpError(400, '数字人名称最多 40 字');
        patch.name = name;
      }

      if (body.gender !== undefined) {
        if (body.gender !== 'male' && body.gender !== 'female') {
          throw httpError(400, '性别无效');
        }
        patch.gender = body.gender;
      }

      if (body.backgroundType !== undefined || body.backgroundColor !== undefined) {
        const type = parseBackgroundType(
          body.backgroundType,
          doc.backgroundType === 'image' ? 'image' : 'color'
        );
        patch.backgroundType = type;
        if (body.backgroundColor !== undefined) {
          patch.backgroundColor = normalizeColor(body.backgroundColor, doc.backgroundColor || '#f3ebe0');
        }
        if (type === 'color') {
          patch.backgroundImage = '';
        } else {
          const nextImage = uploadedPath(files, 'backgroundImage', 'digital-humans/backgrounds');
          if (nextImage) patch.backgroundImage = nextImage;
          else if (doc.backgroundImage) patch.backgroundImage = doc.backgroundImage;
          else throw httpError(400, '图片背景请上传背景图');
        }
      } else if (readBool(body.removeBackgroundImage)) {
        patch.backgroundType = 'color';
        patch.backgroundImage = '';
      }

      const glbFile = files.glb && files.glb[0];
      if (glbFile) {
        const inspection = inspectUploadedGlb(glbFile);
        patch.glbUrl = '/uploads/digital-humans/' + glbFile.filename;
        patch.rigInfo = stringifyJson({
          boneCount: inspection.boneCount,
          compatible: inspection.compatible,
          missing: inspection.missing
        });
        // 换模型后旧缩略图不再可信；前端本次未生成新图就先清空
        if (!uploadedPath(files, 'thumbnail', 'digital-humans/thumbs')) {
          patch.thumbnail = '';
        }
      }

      const nextThumbnail = uploadedPath(files, 'thumbnail', 'digital-humans/thumbs');
      if (nextThumbnail) patch.thumbnail = nextThumbnail;

      if (body.sortOrder !== undefined) {
        patch.sortOrder = parseInt(body.sortOrder, 10) || 0;
      }

      const nextEnabled = body.enabled !== undefined ? readBool(body.enabled) : null;
      if (nextEnabled === false) patch.enabled = false;

      await dbm.db.update(digitalHumans).set(patch).where(eq(digitalHumans.id, doc.id));
      dbUpdated = true;

      if (nextEnabled === true) {
        await activateOnly(doc.id);
      }

      if (glbFile && doc.glbUrl && patch.glbUrl && patch.glbUrl !== doc.glbUrl) {
        deleteUploadByUrl(doc.glbUrl);
      }
      if (
        patch.backgroundType === 'color' &&
        files.backgroundImage &&
        files.backgroundImage[0]
      ) {
        // 用户先选图片又切回纯色：新上传的背景图不再引用，立即清理
        try {
          fs.unlinkSync(files.backgroundImage[0].path);
        } catch (e) {
          /* ignore */
        }
      }
      if (
        patch.backgroundImage !== undefined &&
        doc.backgroundImage &&
        patch.backgroundImage !== doc.backgroundImage
      ) {
        deleteUploadByUrl(doc.backgroundImage);
      }
      if (patch.thumbnail !== undefined && doc.thumbnail && patch.thumbnail !== doc.thumbnail) {
        deleteUploadByUrl(doc.thumbnail);
      }

      const fresh = await getRow(doc.id);
      res.json({ ok: true, data: mapRow(fresh, true) });
    } catch (e) {
      if (!dbUpdated) deleteUploadedFiles(files);
      if (e && e.status) return res.status(e.status).json({ ok: false, message: e.message });
      throw e;
    }
  })
);

/** DELETE /api/admin/digital-humans/:id — 删除记录并清理文件 */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const { digitalHumans } = dbm.schema;
    const doc = await getRow(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '数字人不存在' });

    await dbm.db.delete(digitalHumans).where(eq(digitalHumans.id, doc.id));
    deleteUploadByUrl(doc.glbUrl);
    deleteUploadByUrl(doc.backgroundImage);
    deleteUploadByUrl(doc.thumbnail);
    res.json({ ok: true, message: '已删除' });
  })
);

/** POST /api/admin/digital-humans/:id/activate — 启用并自动停用其他 */
admin.post(
  '/:id/activate',
  asyncHandler(async function (req, res) {
    const doc = await getRow(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '数字人不存在' });
    await activateOnly(doc.id);
    const fresh = await getRow(doc.id);
    res.json({ ok: true, data: mapRow(fresh, true) });
  })
);

/** POST /api/admin/digital-humans/:id/deactivate — 停用 */
admin.post(
  '/:id/deactivate',
  asyncHandler(async function (req, res) {
    const { digitalHumans } = dbm.schema;
    const doc = await getRow(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '数字人不存在' });
    await dbm.db
      .update(digitalHumans)
      .set({ enabled: false, updatedAt: nowMs() })
      .where(eq(digitalHumans.id, doc.id));
    const fresh = await getRow(doc.id);
    res.json({ ok: true, data: mapRow(fresh, true) });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
