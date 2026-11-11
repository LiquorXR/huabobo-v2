const express = require('express');
const mongoose = require('mongoose');
const StudioModelCategory = require('../models/StudioModelCategory');
const StudioModel = require('../models/StudioModel');
const { requireAdmin } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime } = require('../utils/url');
const { ensureStudioCategories } = require('../utils/studioCategories');

const router = express.Router();

function mapCategory(doc, extra) {
  if (!doc) return null;
  const o = doc.toJSON ? doc.toJSON() : doc;
  const row = {
    id: o.id,
    name: o.name,
    sortOrder: o.sortOrder || 0,
    enabled: o.enabled !== false,
    createdAt: formatDateTime(o.createdAt),
    updatedAt: formatDateTime(o.updatedAt)
  };
  if (extra) Object.assign(row, extra);
  return row;
}

function normalizeName(name) {
  return String(name || '').trim();
}

/** GET /api/studio-model-categories — 工作台分类列表（公开） */
router.get(
  '/',
  asyncHandler(async function (_req, res) {
    res.set('Cache-Control', 'no-store');
    await ensureStudioCategories();
    const items = await StudioModelCategory.find({ enabled: { $ne: false } }).sort({
      sortOrder: 1,
      createdAt: 1
    });
    res.json({
      ok: true,
      data: { list: items.map(function (doc) { return mapCategory(doc); }) }
    });
  })
);

const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

/** GET /api/admin/studio-model-categories */
admin.get(
  '/',
  asyncHandler(async function (_req, res) {
    await ensureStudioCategories();
    const items = await StudioModelCategory.find().sort({ sortOrder: 1, createdAt: 1 });
    const counts = await StudioModel.aggregate([
      { $match: { categoryId: { $ne: null } } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } }
    ]);
    const countMap = {};
    counts.forEach(function (c) {
      countMap[String(c._id)] = c.count;
    });
    res.json({
      ok: true,
      data: {
        list: items.map(function (doc) {
          return mapCategory(doc, { modelCount: countMap[doc._id.toString()] || 0 });
        })
      }
    });
  })
);

/** POST /api/admin/studio-model-categories */
admin.post(
  '/',
  asyncHandler(async function (req, res) {
    const name = normalizeName(req.body && req.body.name);
    if (!name) {
      return res.status(400).json({ ok: false, message: '请填写分类名称' });
    }
    const exists = await StudioModelCategory.findOne({ name: name });
    if (exists) {
      return res.status(400).json({ ok: false, message: '已存在同名分类' });
    }
    const sortOrder = parseInt(req.body && req.body.sortOrder, 10);
    const doc = await StudioModelCategory.create({
      name: name,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      enabled: true
    });
    res.status(201).json({ ok: true, data: mapCategory(doc, { modelCount: 0 }) });
  })
);

/** PUT /api/admin/studio-model-categories/:id */
admin.put(
  '/:id',
  asyncHandler(async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, message: '分类无效' });
    }
    const doc = await StudioModelCategory.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '分类不存在' });
    const body = req.body || {};
    if (body.name !== undefined) {
      const name = normalizeName(body.name);
      if (!name) return res.status(400).json({ ok: false, message: '分类名称不能为空' });
      const dup = await StudioModelCategory.findOne({ name: name, _id: { $ne: doc._id } });
      if (dup) return res.status(400).json({ ok: false, message: '已存在同名分类' });
      doc.name = name;
    }
    if (body.sortOrder !== undefined) doc.sortOrder = parseInt(body.sortOrder, 10) || 0;
    if (body.enabled !== undefined) doc.enabled = body.enabled === true || body.enabled === 'true';
    await doc.save();
    const modelCount = await StudioModel.countDocuments({ categoryId: doc._id });
    res.json({ ok: true, data: mapCategory(doc, { modelCount: modelCount }) });
  })
);

/** DELETE /api/admin/studio-model-categories/:id */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ ok: false, message: '分类无效' });
    }
    const doc = await StudioModelCategory.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '分类不存在' });
    const modelCount = await StudioModel.countDocuments({ categoryId: doc._id });
    if (modelCount > 0) {
      return res.status(400).json({
        ok: false,
        message: '该分类下还有 ' + modelCount + ' 个模型，请先改挂到其他分类或删除模型'
      });
    }
    await StudioModelCategory.deleteOne({ _id: doc._id });
    res.json({ ok: true, message: '已删除' });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
