const express = require('express');
const { eq, desc, and, gte, lt, sql } = require('drizzle-orm');
const dbm = require('../db/client');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime } = require('../utils/url');

const router = express.Router();

router.use(requireAdmin);

/** GET /api/admin/dashboard — 数据看板 */
router.get(
  '/dashboard',
  asyncHandler(async function (_req, res) {
    const { users, works } = dbm.schema;
    const [userRows, workRows] = await Promise.all([
      dbm.db.select({ n: sql`count(*)`.mapWith(Number) }).from(users),
      dbm.db
        .select({ n: sql`count(*)`.mapWith(Number) })
        .from(works)
        .where(eq(works.status, 'published'))
    ]);
    const totalUsers = userRows[0] ? userRows[0].n : 0;
    const totalWorks = workRows[0] ? workRows[0].n : 0;

    const trend = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const rows = await dbm.db
        .select({ n: sql`count(*)`.mapWith(Number) })
        .from(users)
        .where(and(gte(users.createdAt, dayStart.getTime()), lt(users.createdAt, dayEnd.getTime())));

      trend.push({
        date: dayStart.toISOString().slice(0, 10),
        count: rows[0] ? rows[0].n : 0
      });
    }

    const cumulative = [];
    for (let j = 6; j >= 0; j--) {
      const d = new Date(now);
      d.setDate(d.getDate() - j);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      const rows = await dbm.db
        .select({ n: sql`count(*)`.mapWith(Number) })
        .from(users)
        .where(lt(users.createdAt, end.getTime()));
      cumulative.push({
        date: d.toISOString().slice(0, 10),
        total: rows[0] ? rows[0].n : 0
      });
    }

    res.json({
      ok: true,
      data: {
        totalUsers,
        totalWorks,
        userTrend: trend,
        userTotalTrend: cumulative
      }
    });
  })
);

/** GET /api/admin/comments — 留言列表（管理员） */
router.get(
  '/comments',
  asyncHandler(async function (req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const { comments, users, works } = dbm.schema;

    const [items, totalRows] = await Promise.all([
      dbm.db
        .select({
          id: comments.id,
          text: comments.text,
          createdAt: comments.createdAt,
          authorId: users.id,
          authorName: users.nickname,
          authorPhone: users.phone,
          workId: works.id,
          workTitle: works.title
        })
        .from(comments)
        .leftJoin(users, eq(comments.userId, users.id))
        .leftJoin(works, eq(comments.workId, works.id))
        .orderBy(desc(comments.createdAt))
        .limit(limit)
        .offset(skip),
      dbm.db.select({ n: sql`count(*)`.mapWith(Number) }).from(comments)
    ]);
    const total = totalRows[0] ? totalRows[0].n : 0;

    const list = items.map(function (c) {
      return {
        id: c.id,
        workId: c.workId || '',
        workTitle: c.workTitle || '',
        userId: c.authorId || '',
        userName: c.authorName || '',
        userPhone: c.authorPhone || '',
        text: c.text,
        createdAt: formatDateTime(c.createdAt)
      };
    });

    res.json({
      ok: true,
      data: { list, total, page, limit, pages: Math.ceil(total / limit) || 1 }
    });
  })
);

/** DELETE /api/admin/comments/:id */
router.delete(
  '/comments/:id',
  asyncHandler(async function (req, res) {
    const { comments } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(comments)
      .where(eq(comments.id, req.params.id))
      .limit(1);
    if (!rows.length) return res.status(404).json({ ok: false, message: '留言不存在' });
    await dbm.db.delete(comments).where(eq(comments.id, req.params.id));
    res.json({ ok: true, message: '已删除' });
  })
);

module.exports = router;
