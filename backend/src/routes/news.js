const express = require('express');
const News = require('../models/News');
const { requireAdmin } = require('../middleware/auth');
const { uploadNewsImage } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { publicUrl, formatDate, formatDateTime } = require('../utils/url');
const { renderMarkdown } = require('../utils/markdown');
const newsLimits = require('../constants/newsLimits');

const router = express.Router();

function mapNews(doc, detailed) {
  if (!doc) return null;
  const o = doc.toJSON ? doc.toJSON() : doc;
  return {
    id: o.id,
    title: o.title,
    image: publicUrl(o.image),
    summary: o.summary,
    content: detailed ? o.content : undefined,
    contentHtml: detailed ? renderMarkdown(o.content) : undefined,
    publishedAt: formatDate(o.publishedAt),
    createdAt: formatDateTime(o.createdAt),
    updatedAt: formatDateTime(o.updatedAt)
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
      return new Date(s + 'T12:00:00');
    }
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** GET /api/news — 公开列表 */
router.get(
  '/',
  asyncHandler(async function (req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      News.find().sort({ publishedAt: -1 }).skip(skip).limit(limit),
      News.countDocuments()
    ]);

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
  asyncHandler(async function (req, res) {
    const doc = await News.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '文章不存在' });
    res.json({ ok: true, data: mapNews(doc, true) });
  })
);

const admin = express.Router();
admin.use(requireAdmin);

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
    const imagePath = req.file ? '/uploads/news/' + req.file.filename : req.body.image || '';
    const doc = await News.create({
      title: String(title).trim(),
      summary: summary || '',
      content: content || '',
      image: imagePath,
      publishedAt: parsePublishedAt(req.body)
    });
    res.status(201).json({ ok: true, data: mapNews(doc, true) });
  })
);

/** PUT /api/admin/news/:id */
admin.put(
  '/:id',
  uploadNewsImage.single('image'),
  asyncHandler(async function (req, res) {
    const doc = await News.findById(req.params.id);
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

    if (req.body.title) doc.title = String(req.body.title).trim();
    if (req.body.summary !== undefined) doc.summary = req.body.summary;
    if (req.body.content !== undefined) doc.content = req.body.content;
    if (req.body.publishedAt) doc.publishedAt = parsePublishedAt(req.body);
    if (req.file) doc.image = '/uploads/news/' + req.file.filename;
    else if (req.body.image !== undefined) doc.image = req.body.image;

    await doc.save();
    res.json({ ok: true, data: mapNews(doc, true) });
  })
);

/** DELETE /api/admin/news/:id */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const doc = await News.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '文章不存在' });
    res.json({ ok: true, message: '已删除' });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
