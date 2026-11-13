const express = require('express');
const { eq, desc } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const asyncHandler = require('../utils/asyncHandler');
const requireDb = require('../middleware/requireDb');
const { requireUser } = require('../middleware/userAuth');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();
const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

const VALID_STATUS = ['pending', 'handling', 'done', 'rejected'];

/** POST /api/print-orders — 提交实体打印申请（需登录） */
router.post(
  '/',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const { printOrders } = dbm.schema;
    const workId = String((req.body && req.body.workId) || '').trim();
    const contact = String((req.body && req.body.contact) || '').trim().slice(0, 120);
    const note = String((req.body && req.body.note) || '').trim().slice(0, 500);
    if (!contact) {
      return res.status(400).json({ ok: false, message: '请留下联系方式，方便我们联系打印事宜' });
    }
    const now = nowMs();
    const row = {
      id: newId(),
      workId: workId,
      userId: String(req.userId || ''),
      contact: contact,
      note: note,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    await dbm.db.insert(printOrders).values(row);
    res.status(201).json({ ok: true, data: { id: row.id } });
  })
);

/** GET /api/admin/print-orders — 打印申请列表 */
admin.get(
  '/',
  asyncHandler(async function (req, res) {
    const { printOrders } = dbm.schema;
    const items = await dbm.db.select().from(printOrders).orderBy(desc(printOrders.createdAt)).limit(100);
    res.json({ ok: true, data: { list: items } });
  })
);

/** PATCH /api/admin/print-orders/:id — 标记处理状态 */
admin.patch(
  '/:id',
  asyncHandler(async function (req, res) {
    const { printOrders } = dbm.schema;
    const status = String((req.body && req.body.status) || '').trim();
    if (VALID_STATUS.indexOf(status) < 0) {
      return res.status(400).json({ ok: false, message: '状态无效' });
    }
    await dbm.db.update(printOrders).set({ status: status, updatedAt: nowMs() }).where(eq(printOrders.id, req.params.id));
    res.json({ ok: true });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
