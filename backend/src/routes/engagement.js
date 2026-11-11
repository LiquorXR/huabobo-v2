const express = require('express');
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const Work = require('../models/Work');
const User = require('../models/User');
const requireDb = require('../middleware/requireDb');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime } = require('../utils/url');

const router = express.Router();

function mapComment(c) {
  return {
    id: c._id.toString(),
    workId: c.workId.toString(),
    userId: c.userId ? c.userId._id.toString() : '',
    userName: c.userId ? c.userId.nickname : '用户',
    userHandle: c.userId ? c.userId.handle || '' : '',
    text: c.text,
    createdAt: formatDateTime(c.createdAt)
  };
}

async function buildWorkEngagement(workId, viewerId) {
  const workObjectId = new mongoose.Types.ObjectId(workId);
  const [comments, likes] = await Promise.all([
    Comment.find({ workId: workObjectId })
      .sort({ createdAt: -1 })
      .populate('userId', 'nickname handle'),
    Like.find({ workId: workObjectId })
  ]);

  const likerIds = likes.map(function (l) {
    return l.userId.toString();
  });
  const likedByMe = viewerId ? likerIds.indexOf(String(viewerId)) !== -1 : false;

  return {
    workId: workId,
    likeCount: likes.length,
    likedByMe: likedByMe,
    commentCount: comments.length,
    comments: comments.map(mapComment)
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
    const validIds = rawIds.filter(function (id) {
      return mongoose.Types.ObjectId.isValid(id);
    });

    const map = {};
    await Promise.all(
      validIds.map(async function (workId) {
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
  asyncHandler(async function (req, res) {
    const { workId, userId } = req.body || {};
    if (!workId || !userId) {
      return res.status(400).json({ ok: false, message: '参数不完整' });
    }
    if (!mongoose.Types.ObjectId.isValid(workId) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ ok: false, message: '参数无效' });
    }

    const work = await Work.findById(workId);
    if (!work) return res.status(404).json({ ok: false, message: '作品不存在' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: '用户不存在' });

    const existing = await Like.findOne({ workId, userId });
    var liked;
    if (existing) {
      await existing.deleteOne();
      liked = false;
    } else {
      await Like.create({ workId, userId });
      liked = true;
    }

    const engagement = await buildWorkEngagement(workId, userId);
    res.json({ ok: true, liked: liked, data: engagement });
  })
);

module.exports = router;
