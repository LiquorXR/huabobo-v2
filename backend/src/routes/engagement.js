const express = require('express');
const { eq, and, desc } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const requireDb = require('../middleware/requireDb');
const { requireUser } = require('../middleware/userAuth');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime } = require('../utils/url');

const router = express.Router();

function mapComment(row) {
  return {
    id: row.id,
    workId: row.workId,
    userId: row.authorId || '',
    userName: row.authorName || '用户',
    userHandle: row.authorHandle || '',
    text: row.text,
    createdAt: formatDateTime(row.createdAt)
  };
}

async function buildWorkEngagement(workId, viewerId) {
  const { comments, likes, users } = dbm.schema;
  const [commentRows, likeRows] = await Promise.all([
    dbm.db
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
      .orderBy(desc(comments.createdAt)),
    dbm.db.select({ userId: likes.userId }).from(likes).where(eq(likes.workId, workId))
  ]);

  const likerIds = likeRows.map(function (l) {
    return String(l.userId);
  });
  const likedByMe = viewerId ? likerIds.indexOf(String(viewerId)) !== -1 : false;

  return {
    workId: workId,
    likeCount: likeRows.length,
    likedByMe: likedByMe,
    commentCount: commentRows.length,
    comments: commentRows.map(mapComment)
  };
}

/** GET /api/engagement?workIds=a,b&viewerId= — 批量互动数据（展厅列表） */
router.get(
  '/',
  requireDb,
  asyncHandler(async function (req, res) {
    const rawIds = (req.query.workIds || '')
      .split(',')
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    const viewerId = (req.query.viewerId || '').trim();

    const map = {};
    await Promise.all(
      rawIds.map(async function (workId) {
        map[workId] = await buildWorkEngagement(workId, viewerId);
      })
    );

    res.json({ ok: true, data: map });
  })
);

/** POST /api/engagement/like — 点赞/取消（需登录 userId） */
router.post(
  '/like',
  requireDb,
  requireUser,
  asyncHandler(async function (req, res) {
    const { workId } = req.body || {};
    const userId = req.userId;
    if (!workId || !userId) {
      return res.status(400).json({ ok: false, message: '参数不完整' });
    }

    const { likes, works, users } = dbm.schema;
    const work = await dbm.db.select().from(works).where(eq(works.id, workId)).limit(1);
    if (!work.length) return res.status(404).json({ ok: false, message: '作品不存在' });
    const user = await dbm.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user.length) return res.status(404).json({ ok: false, message: '用户不存在' });

    const existing = await dbm.db
      .select()
      .from(likes)
      .where(and(eq(likes.workId, workId), eq(likes.userId, userId)))
      .limit(1);
    var liked;
    if (existing.length) {
      await dbm.db.delete(likes).where(eq(likes.id, existing[0].id));
      liked = false;
    } else {
      try {
        await dbm.db.insert(likes).values({ id: newId(), workId, userId, createdAt: nowMs() });
      } catch (e) {
        if (e && (e.code === '23505' || e.code === 'SQLITE_CONSTRAINT_UNIQUE')) {
          const err = new Error('数据已存在');
          err.status = 409;
          throw err;
        }
        throw e;
      }
      liked = true;
    }

    const engagement = await buildWorkEngagement(workId, userId);
    res.json({ ok: true, liked: liked, data: engagement });
  })
);

module.exports = router;
