const express = require('express');
const { eq, and, desc, sql } = require('drizzle-orm');
const jwt = require('jsonwebtoken');
const config = require('../config');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const asyncHandler = require('../utils/asyncHandler');
const { formatDate } = require('../utils/url');
const { persistWorkImage, normalizeWorkImage } = require('../utils/workImage');
const { uploadWorkCover } = require('../middleware/upload');
const requireDb = require('../middleware/requireDb');
const { requireUser } = require('../middleware/userAuth');

const router = express.Router();

function readBool(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

const STUDIO_MAX_CHARS = 200 * 1024;

function normalizeStudioInput(raw) {
  if (raw == null || raw === '') return '';
  var s = typeof raw === 'string' ? raw : JSON.stringify(raw);
  if (!s) return '';
  if (s.length > STUDIO_MAX_CHARS) {
    const err = new Error('3D 快照过大，请减少模型数量后重试');
    err.status = 413;
    throw err;
  }
  try {
    var parsed = JSON.parse(s);
    if (!parsed || typeof parsed !== 'object') return '';
  } catch (e) {
    const err = new Error('3D 快照格式无效');
    err.status = 400;
    throw err;
  }
  return s;
}

function parseStudioForResponse(stored) {
  if (!stored) return null;
  try {
    var o = typeof stored === 'string' ? JSON.parse(stored) : stored;
    return o && typeof o === 'object' ? o : null;
  } catch (e) {
    return null;
  }
}

/** GET /:id 场景：解析可选登录身份，是作者才返回 studio，避免他人拉取 3D 数据 */
function getOptionalUserId(req) {
  try {
    var h = String((req.headers && req.headers.authorization) || '');
    var m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) return '';
    var payload = jwt.verify(m[1], config.jwtSecret);
    if (payload && payload.type === 'user' && payload.sub) return String(payload.sub);
  } catch (e) {}
  return '';
}

function normalizeStoredImagePath(image) {
  if (!image) return '';
  var s = String(image);
  if (s.indexOf('/uploads/') >= 0) return s.slice(s.indexOf('/uploads/'));
  return s;
}

async function saveWorkFromRequest(req) {
  const { works, users } = dbm.schema;
  const body = req.body || {};
  // 作者以登录 token 为准，忽略客户端传来的 userId（防 IDOR）
  const userId = String(req.userId || '').trim();
  const title = String(body.title || '').trim();
  const id = body.id ? String(body.id).trim() : '';
  const publish = readBool(body.publish);

  if (!userId || !title) {
    const err = new Error('缺少 userId 或 title');
    err.status = 400;
    throw err;
  }
  const author = await dbm.db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!author.length) {
    const err = new Error('用户不存在');
    err.status = 400;
    throw err;
  }

  const payload = {
    userId,
    title,
    tag: body.tag || '',
    desc: body.desc || '',
    workType: body.workType === 'ar_snapshot' ? 'ar_snapshot' : 'model',
    publishedAt: publish ? nowMs() : null,
    status: publish ? 'published' : 'draft',
    studio: normalizeStudioInput(body.studio)
  };

  let imagePath = '';
  if (req.file && req.file.filename) {
    imagePath = '/uploads/works/' + req.file.filename;
  } else if (body.cover && String(body.cover).indexOf('data:image') === 0) {
    imagePath = body.cover;
  } else if (body.image && String(body.image).indexOf('data:image') === 0) {
    imagePath = body.image;
  } else if (body.imageKeep) {
    imagePath = normalizeStoredImagePath(body.imageKeep);
  } else if (body.image && String(body.image).indexOf('/uploads/') >= 0) {
    imagePath = normalizeStoredImagePath(body.image);
  } else if (body.image && /^https?:\/\//i.test(String(body.image))) {
    imagePath = normalizeStoredImagePath(body.image);
  }

  let doc = null;
  if (id) {
    const rows = await dbm.db
      .select()
      .from(works)
      .where(and(eq(works.id, id), eq(works.userId, userId)))
      .limit(1);
    doc = rows[0] || null;
    if (doc) {
      const patch = {
        title: payload.title,
        tag: payload.tag,
        desc: payload.desc,
        status: payload.status,
        updatedAt: nowMs()
      };
      if (body.workType) patch.workType = payload.workType;
      if (body.studio !== undefined) patch.studio = payload.studio;
      if (publish && !doc.publishedAt) patch.publishedAt = nowMs();
      if (imagePath) {
        patch.image =
          imagePath.indexOf('data:image') === 0 ? persistWorkImage(imagePath, doc.id) : imagePath;
      }
      await dbm.db.update(works).set(patch).where(eq(works.id, doc.id));
      doc = Object.assign({}, doc, patch);
    }
  }

  if (!doc) {
    const now = nowMs();
    const row = {
      id: newId(),
      userId: payload.userId,
      title: payload.title,
      tag: payload.tag,
      desc: payload.desc,
      status: payload.status,
      workType: payload.workType,
      publishedAt: payload.publishedAt,
      studio: payload.studio || '',
      image: '',
      createdAt: now,
      updatedAt: now
    };
    if (imagePath) {
      row.image =
        imagePath.indexOf('data:image') === 0 ? persistWorkImage(imagePath, row.id) : imagePath;
    }
    await dbm.db.insert(works).values(row);
    doc = row;
  }

  return doc;
}

function mapWorkResponse(doc) {
  return {
    id: doc.id,
    status: doc.status,
    image: normalizeWorkImage(doc.image),
    studio: parseStudioForResponse(doc.studio)
  };
}

function mapWorkRow(w, includeStudio) {
  var out = {
    id: w.id,
    userId: w.authorId || '',
    authorName: w.authorName || '',
    title: w.title,
    image: normalizeWorkImage(w.image),
    tag: w.tag,
    desc: w.desc,
    publishedAt: formatDate(w.publishedAt),
    status: w.status,
    workType: w.workType || 'model'
  };
  if (includeStudio) out.studio = parseStudioForResponse(w.studio);
  return out;
}

/** GET /api/works — 展厅已发布作品；?userId= 可查某用户作品，?includeDraft=1 含草稿 */
router.get(
  '/',
  requireDb,
  asyncHandler(async function (req, res) {
    const { works, users } = dbm.schema;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const userId = (req.query.userId || '').trim();
    const includeDraft = req.query.includeDraft === '1' || req.query.includeDraft === 'true';

    const conds = [];
    if (userId) conds.push(eq(works.userId, userId));
    if (!(userId && includeDraft)) conds.push(eq(works.status, 'published'));
    const where = conds.length ? and(...conds) : undefined;

    const [items, totalRows] = await Promise.all([
      dbm.db
        .select({
          id: works.id,
          title: works.title,
          image: works.image,
          tag: works.tag,
          desc: works.desc,
          publishedAt: works.publishedAt,
          status: works.status,
          workType: works.workType,
          createdAt: works.createdAt,
          authorId: users.id,
          authorName: users.nickname
        })
        .from(works)
        .leftJoin(users, eq(works.userId, users.id))
        .where(where)
        .orderBy(sql`${works.publishedAt} DESC NULLS LAST`, desc(works.createdAt))
        .limit(limit)
        .offset(skip),
      dbm.db
        .select({ n: sql`count(*)`.mapWith(Number) })
        .from(works)
        .where(where)
    ]);
    const total = totalRows[0] ? totalRows[0].n : 0;

    res.json({
      ok: true,
      data: { list: items.map(mapWorkRow), total, page, limit, pages: Math.ceil(total / limit) || 1 }
    });
  })
);

/** GET /api/works/:id — 单件作品（公开，含草稿；仅作者本人返回 studio 3D 快照） */
router.get(
  '/:id',
  requireDb,
  asyncHandler(async function (req, res) {
    const { works, users } = dbm.schema;
    const items = await dbm.db
      .select({
        id: works.id,
        title: works.title,
        image: works.image,
        tag: works.tag,
        desc: works.desc,
        publishedAt: works.publishedAt,
        status: works.status,
        workType: works.workType,
        studio: works.studio,
        createdAt: works.createdAt,
        authorId: users.id,
        authorName: users.nickname
      })
      .from(works)
      .leftJoin(users, eq(works.userId, users.id))
      .where(eq(works.id, req.params.id))
      .limit(1);
    const w = items[0];
    if (!w) return res.status(404).json({ ok: false, message: '作品不存在' });
    const viewerId = getOptionalUserId(req);
    const isOwner = viewerId && w.authorId && viewerId === w.authorId;
    res.json({ ok: true, data: mapWorkRow(w, !!isOwner) });
  })
);

/** POST /api/works — 保存/发布作品（支持 JSON 或 multipart 上传 cover 封面） */
router.post(
  '/',
  requireDb,
  requireUser,
  function (req, res, next) {
    var ct = String(req.headers['content-type'] || '');
    if (ct.indexOf('multipart/form-data') >= 0) {
      return uploadWorkCover.single('cover')(req, res, function (err) {
        if (err) {
          return res.status(400).json({ ok: false, message: err.message || '封面上传失败' });
        }
        next();
      });
    }
    next();
  },
  asyncHandler(async function (req, res) {
    const doc = await saveWorkFromRequest(req);
    res.status(201).json({
      ok: true,
      data: mapWorkResponse(doc)
    });
  })
);

/** DELETE /api/works/:id?userId= — 删除自己的作品（含草稿，留言/点赞由外键级联删除） */
router.delete(
  '/:id',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ ok: false, message: '缺少 userId' });
    }
    const { works } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(works)
      .where(and(eq(works.id, req.params.id), eq(works.userId, userId)))
      .limit(1);
    if (!rows.length) {
      return res.status(404).json({ ok: false, message: '作品不存在或无权删除' });
    }
    await dbm.db.delete(works).where(eq(works.id, req.params.id));
    res.json({ ok: true });
  })
);

module.exports = router;
