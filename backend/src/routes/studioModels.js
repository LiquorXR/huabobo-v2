const express = require('express');
const { eq, and, desc, sql } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const { requireAdmin } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const { requireUser } = require('../middleware/userAuth');
const { uploadStudioModelFiles } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { publicUrl, formatDateTime } = require('../utils/url');
const { persistDataImage } = require('../utils/workImage');

const router = express.Router();

function parseStoredCategoryIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(function (x) { return String(x).trim(); }).filter(Boolean);
  var s = String(raw).trim();
  if (!s) return [];
  if (s[0] === '[') {
    try {
      var arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr.map(function (x) { return String(x).trim(); }).filter(Boolean);
    } catch (e) { return []; }
    return [];
  }
  return s.split(/[，,;；\s]+/).map(function (x) { return x.trim(); }).filter(Boolean);
}

function modelMatchesCategory(row, categoryId) {
  if (!row || !categoryId) return false;
  if (row.categoryId && String(row.categoryId) === String(categoryId)) return true;
  var ids = parseStoredCategoryIds(row.categoryIds);
  return ids.indexOf(String(categoryId)) >= 0;
}

function mapStudioModel(row) {
  if (!row) return null;
  var ids = parseStoredCategoryIds(row.categoryIds);
  if (!ids.length && row.categoryId) ids = [String(row.categoryId)];
  return {
    id: row.id,
    name: row.name,
    desc: row.desc,
    glbUrl: publicUrl(row.glbUrl),
    thumbnail: publicUrl(row.thumbnail),
    categoryId: row.categoryId || (ids[0] || ''),
    categoryIds: ids,
    categoryName: row.categoryName || '',
    sortOrder: row.sortOrder || 0,
    enabled: row.enabled !== false && row.enabled !== 0,
    createdAt: formatDateTime(row.createdAt),
    updatedAt: formatDateTime(row.updatedAt)
  };
}

async function resolveCategory(categoryId) {
  if (!categoryId || !String(categoryId).trim()) return null;
  const { studioModelCategories } = dbm.schema;
  const rows = await dbm.db
    .select()
    .from(studioModelCategories)
    .where(eq(studioModelCategories.id, String(categoryId).trim()))
    .limit(1);
  return rows[0] || null;
}

async function fetchModels(filter) {
  const { studioModels, studioModelCategories } = dbm.schema;
  return dbm.db
    .select({
      id: studioModels.id,
      name: studioModels.name,
      desc: studioModels.desc,
      glbUrl: studioModels.glbUrl,
      thumbnail: studioModels.thumbnail,
      categoryId: studioModels.categoryId,
      categoryIds: studioModels.categoryIds,
      categoryName: studioModelCategories.name,
      sortOrder: studioModels.sortOrder,
      enabled: studioModels.enabled,
      createdAt: studioModels.createdAt,
      updatedAt: studioModels.updatedAt
    })
    .from(studioModels)
    .leftJoin(studioModelCategories, eq(studioModels.categoryId, studioModelCategories.id))
    .where(filter)
    .orderBy(desc(studioModels.sortOrder), desc(studioModels.createdAt));
}

/** GET /api/studio-models — 工作台模型库公开，按分类筛选；?categoryId= 单类（兼容老），?categoryIds=a,b 多类 OR */
router.get(
  '/',
  requireDb,
  asyncHandler(async function (req, res) {
    res.set('Cache-Control', 'no-store');
    const categoryId = String((req.query && req.query.categoryId) || '').trim();
    const categoryIdsRaw = String((req.query && (req.query.categoryIds || req.query.category_ids)) || '').trim();
    const wanted = categoryIdsRaw
      ? categoryIdsRaw.split(/[，,;；\s]+/).map(function (x) { return x.trim(); }).filter(Boolean)
      : (categoryId ? [categoryId] : []);
    if (!wanted.length) {
      return res.status(400).json({ ok: false, message: '请选择模型分类' });
    }
    const { studioModels } = dbm.schema;
    const { studioModelCategories } = dbm.schema;
    var primary = null;
    for (var i = 0; i < wanted.length; i++) {
      var c = await resolveCategory(wanted[i]);
      if (c && c.enabled !== false && c.enabled !== 0) { primary = primary || c; }
      if (!c) return res.status(404).json({ ok: false, message: '分类不存在' });
    }
    // 量小：全量拉取后按 categoryId/categoryIds OR 过滤，保证一物多类在每个归属类都出现
    const items = await fetchModels(eq(studioModels.enabled, true));
    const list = (items || []).filter(function (m) {
      if (m.enabled === false || m.enabled === 0) return false;
      for (var k = 0; k < wanted.length; k++) {
        if (modelMatchesCategory(m, wanted[k])) return true;
      }
      return false;
    });
    res.json({
      ok: true,
      data: {
        category: primary ? { id: primary.id, name: primary.name } : { id: wanted[0], name: '' },
        list: list.slice(0, 100).map(mapStudioModel)
      }
    });
  })
);

/** POST /api/studio-models/:id/thumbnail — 工作台根据 GLB 自动补缩略图（仅空封面时写入） */
router.post(
  '/:id/thumbnail',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const { studioModels } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(studioModels)
      .where(eq(studioModels.id, req.params.id))
      .limit(1);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ ok: false, message: '模型不存在' });
    const raw = (req.body && (req.body.thumbnailBase64 || req.body.image)) || '';
    const saved = persistDataImage(String(raw), 'models/thumbs', doc.id);
    if (!saved) {
      return res.status(400).json({ ok: false, message: '缩略图无效' });
    }
    await dbm.db
      .update(studioModels)
      .set({ thumbnail: saved, updatedAt: nowMs() })
      .where(eq(studioModels.id, doc.id));
    res.json({ ok: true, data: mapStudioModel(Object.assign({}, doc, { thumbnail: saved })) });
  })
);

const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

/** GET /api/admin/studio-models */
admin.get(
  '/',
  asyncHandler(async function (req, res) {
    const { studioModels, studioModelCategories } = dbm.schema;
    const categoryId = String((req.query && req.query.categoryId) || '').trim();
    let filter;
    if (categoryId) {
      const category = await resolveCategory(categoryId);
      if (!category) return res.status(404).json({ ok: false, message: '分类不存在' });
      filter = eq(studioModels.categoryId, category.id);
    }
    const items = await fetchModels(filter);
    var allCats = [];
    try { allCats = await dbm.db.select().from(studioModelCategories); } catch (e) { allCats = []; }
    var nameById = {};
    allCats.forEach(function (c) { nameById[c.id] = c.name; });
    var list = items.map(function (m) {
      var mapped = mapStudioModel(m);
      var names = (mapped.categoryIds || []).map(function (id) { return nameById[id] || ''; }).filter(Boolean);
      if (!names.length && mapped.categoryName) names = [mapped.categoryName];
      mapped.categoryNames = names;
      return mapped;
    });
    // ?categoryId= 筛选时同样按多分类 OR 命中
    if (categoryId) {
      list = list.filter(function (m) {
        if ((m.categoryIds || []).indexOf(categoryId) >= 0) return true;
        return m.categoryId === categoryId;
      });
    }
    res.json({ ok: true, data: { list: list } });
  })
);

async function resolveIncomingCategories(body) {
  var rawList = [];
  var cand = (body && (body.categoryIds || body.category_ids || body['categoryIds[]'])) || '';
  if (cand) {
    if (Array.isArray(cand)) rawList = cand;
    else {
      var s = String(cand).trim();
      if (s[0] === '[') {
        try { rawList = JSON.parse(s); } catch (e) { rawList = s.split(/[，,;；\s]+/); }
      } else rawList = s.split(/[，,;；\s]+/);
    }
  }
  if ((!rawList || !rawList.length) && body && body.categoryId) rawList = [body.categoryId];
  rawList = (rawList || []).map(function (x) { return String(x).trim(); }).filter(Boolean);
  // 去重
  var seen = {};
  rawList = rawList.filter(function (x) { if (seen[x]) return false; seen[x] = true; return true; });
  if (!rawList.length) return { ids: [], categories: [] };
  var cats = [];
  for (var i = 0; i < rawList.length; i++) {
    var c = await resolveCategory(rawList[i]);
    if (!c) {
      const err = new Error('分类不存在：' + rawList[i]);
      err.status = 400;
      throw err;
    }
    cats.push(c);
  }
  return { ids: cats.map(function (c) { return c.id; }), categories: cats };
}

/** POST /api/admin/studio-models — 上传 GLB */
admin.post(
  '/',
  function (req, res, next) {
    uploadStudioModelFiles(req, res, function (err) {
      if (err) {
        return res.status(400).json({ ok: false, message: err.message || '上传失败' });
      }
      next();
    });
  },
  asyncHandler(async function (req, res) {
    const { studioModels } = dbm.schema;
    const { name, desc, sortOrder } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, message: '请填写模型名称' });
    }
    var resolved;
    try {
      resolved = await resolveIncomingCategories(req.body || {});
    } catch (e) {
      return res.status(e.status || 400).json({ ok: false, message: e.message || '请选择归属分类' });
    }
    if (!resolved.ids.length) {
      return res.status(400).json({ ok: false, message: '请选择归属分类（可多选）' });
    }
    const category = resolved.categories[0];
    if (!req.files || !req.files.glb || !req.files.glb[0]) {
      return res.status(400).json({ ok: false, message: '请上传 GLB 模型文件' });
    }
    const glbUrl = '/uploads/models/' + req.files.glb[0].filename;
    const thumbnail = pickThumbnailPath(req.files, req.body);
    const now = nowMs();
    const row = {
      id: newId(),
      name: String(name).trim(),
      desc: desc || '',
      glbUrl: glbUrl,
      thumbnail: thumbnail,
      categoryId: category.id,
      categoryIds: JSON.stringify(resolved.ids),
      sortOrder: parseInt(sortOrder, 10) || 0,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };
    await dbm.db.insert(studioModels).values(row);
    res.status(201).json({
      ok: true,
      data: mapStudioModel(Object.assign({}, row, { categoryName: category.name }))
    });
  })
);

/** PUT /api/admin/studio-models/:id */
admin.put(
  '/:id',
  function (req, res, next) {
    uploadStudioModelFiles(req, res, function (err) {
      if (err) {
        return res.status(400).json({ ok: false, message: err.message || '上传失败' });
      }
      next();
    });
  },
  asyncHandler(async function (req, res) {
    const { studioModels } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(studioModels)
      .where(eq(studioModels.id, req.params.id))
      .limit(1);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ ok: false, message: '模型不存在' });

    const body = req.body || {};
    const patch = { updatedAt: nowMs() };
    if (body.name !== undefined) patch.name = String(body.name).trim();
    if (body.desc !== undefined) patch.desc = String(body.desc);
    if (body.sortOrder !== undefined) patch.sortOrder = parseInt(body.sortOrder, 10) || 0;
    if (body.enabled !== undefined) patch.enabled = body.enabled === 'true' || body.enabled === true;
    var wantsCategory = body.categoryIds !== undefined || body.category_ids !== undefined || body['categoryIds[]'] !== undefined || body.categoryId !== undefined;
    if (wantsCategory) {
      var resolvedPatch;
      try {
        resolvedPatch = await resolveIncomingCategories(body);
      } catch (e) {
        return res.status(e.status || 400).json({ ok: false, message: e.message || '请选择归属分类' });
      }
      if (!resolvedPatch.ids.length) {
        return res.status(400).json({ ok: false, message: '请选择归属分类（可多选）' });
      }
      patch.categoryId = resolvedPatch.ids[0];
      patch.categoryIds = JSON.stringify(resolvedPatch.ids);
    }
    if (!doc.categoryId && patch.categoryId === undefined && !parseStoredCategoryIds(doc.categoryIds).length) {
      return res.status(400).json({ ok: false, message: '请选择归属分类' });
    }

    const newGlb = !!(req.files && req.files.glb && req.files.glb[0]);
    if (newGlb) {
      patch.glbUrl = '/uploads/models/' + req.files.glb[0].filename;
    } else if (body.glbUrlKeep) {
      patch.glbUrl = normalizeStoredPath(body.glbUrlKeep);
    }

    const nextThumb = pickThumbnailPath(req.files, body);
    if (nextThumb) {
      patch.thumbnail = nextThumb;
    } else if (newGlb) {
      patch.thumbnail = '';
    } else if (body.thumbnailKeep !== undefined) {
      patch.thumbnail = normalizeStoredPath(body.thumbnailKeep);
    }

    const merged = Object.assign({}, doc, patch);
    if (!merged.name) {
      return res.status(400).json({ ok: false, message: '模型名称不能为空' });
    }

    await dbm.db.update(studioModels).set(patch).where(eq(studioModels.id, doc.id));
    const category = merged.categoryId ? await resolveCategory(merged.categoryId) : null;
    res.json({
      ok: true,
      data: mapStudioModel(Object.assign({}, merged, { categoryName: category ? category.name : '' }))
    });
  })
);

/** DELETE /api/admin/studio-models/:id */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const { studioModels } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(studioModels)
      .where(eq(studioModels.id, req.params.id))
      .limit(1);
    if (!rows.length) return res.status(404).json({ ok: false, message: '模型不存在' });
    await dbm.db.delete(studioModels).where(eq(studioModels.id, req.params.id));
    res.json({ ok: true, message: '已删除' });
  })
);

function pickThumbnailPath(files, body) {
  if (files && files.thumbnail && files.thumbnail[0]) {
    return '/uploads/models/thumbs/' + files.thumbnail[0].filename;
  }
  if (body && body.thumbnailBase64) {
    return persistDataImage(String(body.thumbnailBase64), 'models/thumbs', 'thumb') || '';
  }
  return '';
}

function normalizeStoredPath(raw) {
  if (!raw) return '';
  var s = String(raw).trim();
  var ui = s.indexOf('/uploads/');
  if (ui >= 0) return s.slice(ui);
  return s;
}

module.exports = { publicRouter: router, adminRouter: admin };
