const express = require('express');
const mongoose = require('mongoose');
const Work = require('../models/Work');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const asyncHandler = require('../utils/asyncHandler');
const { formatDate } = require('../utils/url');
const { persistWorkImage, normalizeWorkImage } = require('../utils/workImage');
const { uploadWorkCover } = require('../middleware/upload');

const router = express.Router();

function readBool(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function normalizeStoredImagePath(image) {
  if (!image) return '';
  var s = String(image);
  if (s.indexOf('/uploads/') >= 0) return s.slice(s.indexOf('/uploads/'));
  if (/^https?:\/\//i.test(s) && s.indexOf('/uploads/') >= 0) {
    return s.slice(s.indexOf('/uploads/'));
  }
  return s;
}

async function saveWorkFromRequest(req) {
  const body = req.body || {};
  const userId = String(body.userId || '').trim();
  const title = String(body.title || '').trim();
  const id = body.id ? String(body.id).trim() : '';
  const publish = readBool(body.publish);

  if (!userId || !title) {
    const err = new Error('缺少 userId 或 title');
    err.status = 400;
    throw err;
  }

  const payload = {
    userId,
    title,
    tag: body.tag || '',
    desc: body.desc || '',
    workType: body.workType === 'ar_snapshot' ? 'ar_snapshot' : 'model',
    publishedAt: publish ? new Date() : undefined,
    status: publish ? 'published' : 'draft'
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

  let doc;
  if (id && mongoose.Types.ObjectId.isValid(id)) {
    doc = await Work.findOne({ _id: id, userId });
    if (doc) {
      doc.title = payload.title;
      doc.tag = payload.tag;
      doc.desc = payload.desc;
      doc.status = payload.status;
      if (body.workType) doc.workType = payload.workType;
      if (publish) doc.publishedAt = doc.publishedAt || new Date();
      if (imagePath) {
        if (imagePath.indexOf('data:image') === 0) {
          doc.image = persistWorkImage(imagePath, doc._id.toString());
        } else {
          doc.image = imagePath;
        }
      }
      await doc.save();
    }
  }

  if (!doc) {
    doc = await Work.create({
      userId: payload.userId,
      title: payload.title,
      tag: payload.tag,
      desc: payload.desc,
      status: payload.status,
      workType: payload.workType,
      publishedAt: payload.publishedAt,
      image: ''
    });
    if (imagePath) {
      if (imagePath.indexOf('data:image') === 0) {
        doc.image = persistWorkImage(imagePath, doc._id.toString());
      } else {
        doc.image = imagePath;
      }
      await doc.save();
    }
  }

  return doc;
}

function mapWorkResponse(doc) {
  return {
    id: doc._id.toString(),
    status: doc.status,
    image: normalizeWorkImage(doc.image)
  };
}

/** GET /api/works — 展厅已发布作品；?userId= 可查某用户作品，?includeDraft=1 含草稿 */
router.get(
  '/',
  asyncHandler(async function (req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const userId = (req.query.userId || '').trim();
    const includeDraft = req.query.includeDraft === '1' || req.query.includeDraft === 'true';

    const filter = userId
      ? includeDraft
        ? { userId }
        : { userId, status: 'published' }
      : { status: 'published' };

    const [items, total] = await Promise.all([
      Work.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'nickname handle avatar'),
      Work.countDocuments(filter)
    ]);

    const list = items.map(function (w) {
      return {
        id: w._id.toString(),
        userId: w.userId ? w.userId._id.toString() : '',
        authorName: w.userId ? w.userId.nickname : '',
        title: w.title,
        image: normalizeWorkImage(w.image),
        tag: w.tag,
        desc: w.desc,
        publishedAt: formatDate(w.publishedAt),
        status: w.status,
        workType: w.workType || 'model'
      };
    });

    res.json({
      ok: true,
      data: { list, total, page, limit, pages: Math.ceil(total / limit) || 1 }
    });
  })
);

/** GET /api/works/:id — 单件作品（公开，含草稿） */
router.get(
  '/:id',
  asyncHandler(async function (req, res) {
    const w = await Work.findById(req.params.id).populate('userId', 'nickname handle avatar');
    if (!w) return res.status(404).json({ ok: false, message: '作品不存在' });
    res.json({
      ok: true,
      data: {
        id: w._id.toString(),
        userId: w.userId ? w.userId._id.toString() : '',
        authorName: w.userId ? w.userId.nickname : '',
        title: w.title,
        image: normalizeWorkImage(w.image),
        tag: w.tag,
        desc: w.desc,
        publishedAt: formatDate(w.publishedAt),
        status: w.status,
        workType: w.workType || 'model'
      }
    });
  })
);

/** POST /api/works — 保存/发布作品（支持 JSON 或 multipart 上传 cover 封面） */
router.post(
  '/',
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

/** DELETE /api/works/:id?userId= — 删除自己的作品（含草稿） */
router.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const userId = String(req.query.userId || (req.body && req.body.userId) || '').trim();
    if (!userId) {
      return res.status(400).json({ ok: false, message: '缺少 userId' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, message: '无效的作品 ID' });
    }
    const doc = await Work.findOne({ _id: req.params.id, userId });
    if (!doc) {
      return res.status(404).json({ ok: false, message: '作品不存在或无权删除' });
    }
    await Comment.deleteMany({ workId: doc._id });
    await Like.deleteMany({ workId: doc._id });
    await doc.deleteOne();
    res.json({ ok: true });
  })
);

module.exports = router;
