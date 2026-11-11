const express = require('express');
const Comment = require('../models/Comment');
const Work = require('../models/Work');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime } = require('../utils/url');

const router = express.Router();

/** GET /api/comments — 按作品查询留言（公开） ?workId= */
router.get(
  '/',
  asyncHandler(async function (req, res) {
    const workId = req.query.workId;
    if (!workId) {
      return res.status(400).json({ ok: false, message: '缺少 workId' });
    }
    const items = await Comment.find({ workId })
      .sort({ createdAt: -1 })
      .populate('userId', 'nickname handle');

    res.json({
      ok: true,
      data: items.map(function (c) {
        return {
          id: c._id.toString(),
          workId: c.workId.toString(),
          userId: c.userId ? c.userId._id.toString() : '',
          userName: c.userId ? c.userId.nickname : '用户',
          userHandle: c.userId ? c.userId.handle : '',
          text: c.text,
          createdAt: formatDateTime(c.createdAt)
        };
      })
    });
  })
);

/** POST /api/comments — 发表留言（公开，需传 userId，对接前端登录态） */
router.post(
  '/',
  asyncHandler(async function (req, res) {
    const { workId, userId, text } = req.body || {};
    const content = (text || '').trim();
    if (!workId || !userId || !content) {
      return res.status(400).json({ ok: false, message: '参数不完整' });
    }
    const work = await Work.findById(workId);
    if (!work) return res.status(404).json({ ok: false, message: '作品不存在' });
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: '用户不存在' });

    const doc = await Comment.create({
      workId,
      userId,
      text: content
    });

    res.status(201).json({
      ok: true,
      data: {
        id: doc._id.toString(),
        workId: doc.workId.toString(),
        userId: doc.userId.toString(),
        userName: user.nickname,
        text: doc.text,
        createdAt: formatDateTime(doc.createdAt)
      }
    });
  })
);

module.exports = router;
