const express = require('express');
const mongoose = require('mongoose');
const StudioModel = require('../models/StudioModel');
const StudioModelCategory = require('../models/StudioModelCategory');
const { requireAdmin } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const { uploadStudioModelFiles } = require('../middleware/upload');
const asyncHandler = require('../utils/asyncHandler');
const { publicUrl, formatDateTime } = require('../utils/url');
const { persistDataImage } = require('../utils/workImage');

const router = express.Router();

function categoryNameOf(doc) {
  const cat = doc && (doc.categoryId || doc.category);
  if (!cat) return '';
  if (typeof cat === 'object' && cat.name) return cat.name;
  return '';
}

function categoryIdOf(doc) {
  const cat = doc && doc.categoryId;
  if (!cat) return '';
  if (typeof cat === 'object' && cat._id) return cat._id.toString();
  if (typeof cat === 'object' && cat.id) return String(cat.id);
  return String(cat);
}

function mapStudioModel(doc) {
  if (!doc) return null;
  const o = doc.toJSON ? doc.toJSON() : doc;
  return {
    id: o.id,
    name: o.name,
    desc: o.desc,
    glbUrl: publicUrl(o.glbUrl),
    thumbnail: publicUrl(o.thumbnail),
    categoryId: categoryIdOf(o),
    categoryName: categoryNameOf(o),
    sortOrder: o.sortOrder || 0,
    enabled: o.enabled !== false,
    createdAt: formatDateTime(o.createdAt),
    updatedAt: formatDateTime(o.updatedAt)
  };
}

async function resolveCategory(categoryId) {
  if (!categoryId || !mongoose.Types.ObjectId.isValid(String(categoryId))) {
    return null;
  }
  return StudioModelCategory.findById(categoryId);
}

/** GET /api/studio-models — 工作台模型库（公开，按分类筛选） */
router.get(
  '/',
  asyncHandler(async function (req, res) {
    res.set('Cache-Control', 'no-store');
    const categoryId = String((req.query && req.query.categoryId) || '').trim();
    if (!categoryId) {
      return res.status(400).json({ ok: false, message: '请选择模型分类' });
    }
    const category = await resolveCategory(categoryId);
    if (!category || category.enabled === false) {
      return res.status(404).json({ ok: false, message: '分类不存在' });
    }
    const items = await StudioModel.find({
      enabled: { $ne: false },
      categoryId: category._id
    })
      .populate('categoryId', 'name')
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(100);
    res.json({
      ok: true,
      data: {
        category: {
          id: category._id.toString(),
          name: category.name
        },
        list: items.map(mapStudioModel)
      }
    });
  })
);

/** POST /api/studio-models/:id/thumbnail — 工作台根据 GLB 自动补缩略图（仅空封面时写入） */
router.post(
  '/:id/thumbnail',
  asyncHandler(async function (req, res) {
    const doc = await StudioModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '模型不存在' });
    const raw = (req.body && (req.body.thumbnailBase64 || req.body.image)) || '';
    const saved = persistDataImage(String(raw), 'models/thumbs', doc._id.toString());
    if (!saved) {
      return res.status(400).json({ ok: false, message: '缩略图无效' });
    }
    doc.thumbnail = saved;
    await doc.save();
    res.json({ ok: true, data: mapStudioModel(doc) });
  })
);

const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

/** GET /api/admin/studio-models */
admin.get(
  '/',
  asyncHandler(async function (req, res) {
    const filter = {};
    const categoryId = String((req.query && req.query.categoryId) || '').trim();
    if (categoryId) {
      const category = await resolveCategory(categoryId);
      if (!category) return res.status(404).json({ ok: false, message: '分类不存在' });
      filter.categoryId = category._id;
    }
    const items = await StudioModel.find(filter)
      .populate('categoryId', 'name')
      .sort({ sortOrder: 1, createdAt: -1 });
    res.json({ ok: true, data: { list: items.map(mapStudioModel) } });
  })
);

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
    const { name, desc, sortOrder, categoryId } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, message: '请填写模型名称' });
    }
    const category = await resolveCategory(categoryId);
    if (!category) {
      return res.status(400).json({ ok: false, message: '请选择归属分类' });
    }
    if (!req.files || !req.files.glb || !req.files.glb[0]) {
      return res.status(400).json({ ok: false, message: '请上传 GLB 模型文件' });
    }
    const glbUrl = '/uploads/models/' + req.files.glb[0].filename;
    let thumbnail = pickThumbnailPath(req.files, req.body);
    const doc = await StudioModel.create({
      name: String(name).trim(),
      desc: desc || '',
      glbUrl: glbUrl,
      thumbnail: thumbnail,
      categoryId: category._id,
      sortOrder: parseInt(sortOrder, 10) || 0,
      enabled: true
    });
    await doc.populate('categoryId', 'name');
    res.status(201).json({ ok: true, data: mapStudioModel(doc) });
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
    const doc = await StudioModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '模型不存在' });

    const body = req.body || {};
    if (body.name !== undefined) doc.name = String(body.name).trim();
    if (body.desc !== undefined) doc.desc = String(body.desc);
    if (body.sortOrder !== undefined) doc.sortOrder = parseInt(body.sortOrder, 10) || 0;
    if (body.enabled !== undefined) doc.enabled = body.enabled === 'true' || body.enabled === true;
    if (body.categoryId !== undefined) {
      const category = await resolveCategory(body.categoryId);
      if (!category) {
        return res.status(400).json({ ok: false, message: '请选择归属分类' });
      }
      doc.categoryId = category._id;
    }
    if (!doc.categoryId) {
      return res.status(400).json({ ok: false, message: '请选择归属分类' });
    }

    const newGlb = !!(req.files && req.files.glb && req.files.glb[0]);
    if (newGlb) {
      doc.glbUrl = '/uploads/models/' + req.files.glb[0].filename;
    } else if (body.glbUrlKeep) {
      doc.glbUrl = normalizeStoredPath(body.glbUrlKeep);
    }

    const nextThumb = pickThumbnailPath(req.files, body);
    if (nextThumb) {
      doc.thumbnail = nextThumb;
    } else if (newGlb) {
      doc.thumbnail = '';
    } else if (body.thumbnailKeep !== undefined) {
      doc.thumbnail = normalizeStoredPath(body.thumbnailKeep);
    }

    if (!doc.name) {
      return res.status(400).json({ ok: false, message: '模型名称不能为空' });
    }

    await doc.save();
    await doc.populate('categoryId', 'name');
    res.json({ ok: true, data: mapStudioModel(doc) });
  })
);

/** DELETE /api/admin/studio-models/:id */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const doc = await StudioModel.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '模型不存在' });
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
