const express = require('express');
const { eq, ne, asc, desc, sql } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const { requireAdmin } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime } = require('../utils/url');
const { ensureStudioCategories } = require('../utils/studioCategories');

const router = express.Router();

function mapCategory(row, extra) {
  if (!row) return null;
  const data = {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder || 0,
    enabled: row.enabled !== false && row.enabled !== 0,
    createdAt: formatDateTime(row.createdAt),
    updatedAt: formatDateTime(row.updatedAt)
  };
  if (extra) Object.assign(data, extra);
  return data;
}

function normalizeName(name) {
  return String(name || '').trim();
}

/** GET /api/studio-model-categories — 工作台分类列表（公开） */
router.get(
  '/',
  requireDb,
  asyncHandler(async function (_req, res) {
    res.set('Cache-Control', 'no-store');
    await ensureStudioCategories();
    const { studioModelCategories } = dbm.schema;
    const items = await dbm.db
      .select()
      .from(studioModelCategories)
      .where(ne(studioModelCategories.enabled, false))
      .orderBy(asc(studioModelCategories.sortOrder), asc(studioModelCategories.createdAt));
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
    const { studioModelCategories, studioModels } = dbm.schema;
    const [items, counts] = await Promise.all([
      dbm.db
        .select()
        .from(studioModelCategories)
        .orderBy(asc(studioModelCategories.sortOrder), asc(studioModelCategories.createdAt)),
      dbm.db
        .select({ categoryId: studioModels.categoryId, n: sql`count(*)`.mapWith(Number) })
        .from(studioModels)
        .where(sql`${studioModels.categoryId} IS NOT NULL`)
        .groupBy(studioModels.categoryId)
    ]);
    const countMap = {};
    counts.forEach(function (c) {
      countMap[String(c.categoryId)] = c.n;
    });
    res.json({
      ok: true,
      data: {
        list: items.map(function (doc) {
          return mapCategory(doc, { modelCount: countMap[doc.id] || 0 });
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
    const { studioModelCategories } = dbm.schema;
    const exists = await dbm.db
      .select()
      .from(studioModelCategories)
      .where(eq(studioModelCategories.name, name))
      .limit(1);
    if (exists.length) {
      return res.status(400).json({ ok: false, message: '已存在同名分类' });
    }
    const sortOrder = parseInt(req.body && req.body.sortOrder, 10);
    const now = nowMs();
    const row = {
      id: newId(),
      name: name,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      enabled: true,
      createdAt: now,
      updatedAt: now
    };
    try {
      await dbm.db.insert(studioModelCategories).values(row);
    } catch (e) {
      if (e && (e.code === '23505' || e.code === 'SQLITE_CONSTRAINT_UNIQUE')) {
        return res.status(400).json({ ok: false, message: '已存在同名分类' });
      }
      throw e;
    }
    res.status(201).json({ ok: true, data: mapCategory(row, { modelCount: 0 }) });
  })
);

/** PUT /api/admin/studio-model-categories/:id */
admin.put(
  '/:id',
  asyncHandler(async function (req, res) {
    const { studioModelCategories, studioModels } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(studioModelCategories)
      .where(eq(studioModelCategories.id, req.params.id))
      .limit(1);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ ok: false, message: '分类不存在' });
    const body = req.body || {};
    const patch = { updatedAt: nowMs() };
    if (body.name !== undefined) {
      const name = normalizeName(body.name);
      if (!name) return res.status(400).json({ ok: false, message: '分类名称不能为空' });
      const dup = await dbm.db
        .select()
        .from(studioModelCategories)
        .where(eq(studioModelCategories.name, name))
        .limit(1);
      if (dup.length && dup[0].id !== doc.id) {
        return res.status(400).json({ ok: false, message: '已存在同名分类' });
      }
      patch.name = name;
    }
    if (body.sortOrder !== undefined) patch.sortOrder = parseInt(body.sortOrder, 10) || 0;
    if (body.enabled !== undefined) patch.enabled = body.enabled === true || body.enabled === 'true';
    await dbm.db.update(studioModelCategories).set(patch).where(eq(studioModelCategories.id, doc.id));
    const modelCountRows = await dbm.db
      .select({ n: sql`count(*)`.mapWith(Number) })
      .from(studioModels)
      .where(eq(studioModels.categoryId, doc.id));
    const modelCount = modelCountRows[0] ? modelCountRows[0].n : 0;
    res.json({ ok: true, data: mapCategory(Object.assign({}, doc, patch), { modelCount: modelCount }) });
  })
);

/** DELETE /api/admin/studio-model-categories/:id */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const { studioModelCategories, studioModels } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(studioModelCategories)
      .where(eq(studioModelCategories.id, req.params.id))
      .limit(1);
    const doc = rows[0];
    if (!doc) return res.status(404).json({ ok: false, message: '分类不存在' });
    const modelCountRows = await dbm.db
      .select({ n: sql`count(*)`.mapWith(Number) })
      .from(studioModels)
      .where(eq(studioModels.categoryId, doc.id));
    const modelCount = modelCountRows[0] ? modelCountRows[0].n : 0;
    if (modelCount > 0) {
      return res.status(400).json({
        ok: false,
        message: '该分类下还有 ' + modelCount + ' 个模型，请先改挂到其他分类或删除模型'
      });
    }
    await dbm.db.delete(studioModelCategories).where(eq(studioModelCategories.id, doc.id));
    res.json({ ok: true, message: '已删除' });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
