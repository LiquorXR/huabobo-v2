const express = require('express');
const { eq, desc } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const requireDb = require('../middleware/requireDb');
const { requireUser } = require('../middleware/userAuth');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime } = require('../utils/url');

const router = express.Router();

function mapCommentRow(c) {
  return {
    id: c.id,
    workId: c.workId,
    userId: c.authorId || '',
    userName: c.authorName || '用户',
    userHandle: c.authorHandle || '',
    text: c.text,
    createdAt: formatDateTime(c.createdAt)
  };
}

/** GET /api/comments — 按作品查询留言（公开） ?workId= */
router.get(
  '/',
  requireDb,
  asyncHandler(async function (req, res) {
    const workId = req.query.workId;
    if (!workId) {
      return res.status(400).json({ ok: false, message: '缺少 workId' });
    }
    const { comments, users } = dbm.schema;
    const items = await dbm.db
      .select({
        id: comments.id,
        workId: comments.workId,
        text: comments.text,
        createdAt: comments.createdAt,
        authorId: users.id,
        authorName: users.nickname,
        authorHandle: users.handle
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.workId, workId))
      .orderBy(desc(comments.createdAt));

    res.json({ ok: true, data: items.map(mapCommentRow) });
  })
);

/** POST /api/comments — 发表留言（公开，需传 userId，对接前端登录态） */
router.post(
  '/',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const { workId, text } = req.body || {};
    const userId = req.userId;
    const content = (text || '').trim();
    if (!workId || !userId || !content) {
      return res.status(400).json({ ok: false, message: '参数不完整' });
    }
    const { comments, works, users } = dbm.schema;
    const work = await dbm.db.select().from(works).where(eq(works.id, workId)).limit(1);
    if (!work.length) return res.status(404).json({ ok: false, message: '作品不存在' });
    const user = await dbm.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) return res.status(404).json({ ok: false, message: '用户不存在' });

    const now = nowMs();
    const row = {
      id: newId(),
      workId,
      userId,
      text: content,
      createdAt: now,
      updatedAt: now
    };
    await dbm.db.insert(comments).values(row);

    res.status(201).json({
      ok: true,
      data: {
        id: row.id,
        workId: row.workId,
        userId: row.userId,
        userName: user[0].nickname,
        text: row.text,
        createdAt: formatDateTime(row.createdAt)
      }
    });
  })
);

module.exports = router;
