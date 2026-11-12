const express = require('express');
const { eq, desc, sql } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const { requireAdmin } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const { uploadNewsImage } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { publicUrl, formatDate, formatDateTime } = require('../utils/url');
const { renderMarkdown } = require('../utils/markdown');
const newsLimits = require('../constants/newsLimits');

const router = express.Router();

function mapNews(doc, detailed) {
  if (!doc) return null;
  return {
    id: doc.id,
    title: doc.title,
    image: publicUrl(doc.image),
    summary: doc.summary,
    content: detailed ? doc.content : undefined,
    contentHtml: detailed ? renderMarkdown(doc.content) : undefined,
    publishedAt: formatDate(doc.publishedAt),
    createdAt: formatDateTime(doc.createdAt),
    updatedAt: formatDateTime(doc.updatedAt)
  };
}

function validateNewsFields(body) {
  const title = body.title != null ? String(body.title).trim() : '';
  const summary = body.summary != null ? String(body.summary) : '';
  const content = body.content != null ? String(body.content) : '';
  if (!title) return '标题不能为空';
  if (title.length > newsLimits.titleMax) {
    return '标题最多 ' + newsLimits.titleMax + ' 字';
  }
  if (summary.length > newsLimits.summaryMax) {
    return '概述最多 ' + newsLimits.summaryMax + ' 字';
  }
  if (content.length > newsLimits.contentMax) {
    return '正文最多 ' + newsLimits.contentMax + ' 字';
  }
  return '';
}

function parsePublishedAt(body) {
  if (body.publishedAt) {
    const s = String(body.publishedAt).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return new Date(s + 'T12:00:00').getTime();
    }
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }
  return Date.now();
}

/** GET /api/news — 公开列表 */
router.get(
  '/',
  requireDb,
  asyncHandler(async function (req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;
    const { news } = dbm.schema;

    const [items, totalRows] = await Promise.all([
      dbm.db
        .select()
        .from(news)
        .orderBy(desc(news.publishedAt))
        .limit(limit)
        .offset(skip),
      dbm.db.select({ n: sql`count(*)`.mapWith(Number) }).from(news)
    ]);
    const total = totalRows[0] ? totalRows[0].n : 0;

    res.json({
      ok: true,
      data: {
        list: items.map(function (n) {
          return mapNews(n, false);
        }),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    });
  })
);

/** GET /api/news/:id — 公开详情 */
router.get(
  '/:id',
  requireDb,
  asyncHandler(async function (req, res) {
    const { news } = dbm.schema;
    const rows = await dbm.db.select().from(news).where(eq(news.id, req.params.id)).limit(1);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ ok: false, message: '文章不存在' });
    res.json({ ok: true, data: mapNews(doc, true) });
  })
);

const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

/** POST /api/admin/news/preview-content — 正文 Markdown 预览（与前台渲染规则一致） */
admin.post(
  '/preview-content',
  asyncHandler(async function (req, res) {
    const content = (req.body && req.body.content) || '';
    res.json({ ok: true, html: renderMarkdown(content) });
  })
);

/** POST /api/admin/news/upload-content-image — 正文插图（单张） */
admin.post(
  '/upload-content-image',
  function (req, res, next) {
    uploadNewsImage.single('image')(req, res, function (err) {
      if (err) {
        return res.status(400).json({ ok: false, message: err.message || '上传失败' });
      }
      next();
    });
  },
  asyncHandler(async function (req, res) {
    if (!req.file) {
      return res.status(400).json({ ok: false, message: '请选择图片' });
    }
    const url = publicUrl('/uploads/news/' + req.file.filename);
    res.json({ ok: true, url: url });
  })
);

/** POST /api/admin/news — 发布新闻（multipart: image 可选） */
admin.post(
  '/',
  uploadNewsImage.single('image'),
  asyncHandler(async function (req, res) {
    const { title, summary, content } = req.body || {};
    const errMsg = validateNewsFields(req.body || {});
    if (errMsg) {
      return res.status(400).json({ ok: false, message: errMsg });
    }
    const { news } = dbm.schema;
    const imagePath = req.file ? '/uploads/news/' + req.file.filename : req.body.image || '';
    const now = nowMs();
    const row = {
      id: newId(),
      title: String(title).trim(),
      summary: summary || '',
      content: content || '',
      image: imagePath,
      publishedAt: parsePublishedAt(req.body),
      createdAt: now,
      updatedAt: now
    };
    await dbm.db.insert(news).values(row);
    res.status(201).json({ ok: true, data: mapNews(row, true) });
  })
);

/** PUT /api/admin/news/:id */
admin.put(
  '/:id',
  uploadNewsImage.single('image'),
  asyncHandler(async function (req, res) {
    const { news } = dbm.schema;
    const rows = await dbm.db.select().from(news).where(eq(news.id, req.params.id)).limit(1);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ ok: false, message: '文章不存在' });

    const errMsg = validateNewsFields(
      Object.assign({}, req.body, {
        title: req.body.title != null ? req.body.title : doc.title,
        summary: req.body.summary !== undefined ? req.body.summary : doc.summary,
        content: req.body.content !== undefined ? req.body.content : doc.content
      })
    );
    if (errMsg) {
      return res.status(400).json({ ok: false, message: errMsg });
    }

    const patch = { updatedAt: nowMs() };
    if (req.body.title) patch.title = String(req.body.title).trim();
    if (req.body.summary !== undefined) patch.summary = req.body.summary;
    if (req.body.content !== undefined) patch.content = req.body.content;
    if (req.body.publishedAt) patch.publishedAt = parsePublishedAt(req.body);
    if (req.file) patch.image = '/uploads/news/' + req.file.filename;
    else if (req.body.image !== undefined) patch.image = req.body.image;

    await dbm.db.update(news).set(patch).where(eq(news.id, doc.id));
    res.json({ ok: true, data: mapNews(Object.assign({}, doc, patch), true) });
  })
);

/** DELETE /api/admin/news/:id */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const { news } = dbm.schema;
    const rows = await dbm.db.select().from(news).where(eq(news.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ ok: false, message: '文章不存在' });
    await dbm.db.delete(news).where(eq(news.id, req.params.id));
    res.json({ ok: true, message: '已删除' });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
