const express = require('express');
const User = require('../models/User');
const Work = require('../models/Work');
const Comment = require('../models/Comment');
const { requireAdmin } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime } = require('../utils/url');

const router = express.Router();

router.use(requireAdmin);

/** GET /api/admin/dashboard — 数据看板 */
router.get(
  '/dashboard',
  asyncHandler(async function (_req, res) {
    const totalUsers = await User.countDocuments();
    const totalWorks = await Work.countDocuments({ status: 'published' });

    const trend = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const count = await User.countDocuments({
        createdAt: { $gte: dayStart, $lt: dayEnd }
      });

      trend.push({
        date: dayStart.toISOString().slice(0, 10),
        count
      });
    }

    const cumulative = [];
    let running = 0;
    for (let j = 6; j >= 0; j--) {
      const d = new Date(now);
      d.setDate(d.getDate() - j);
      const end = new Date(d);
      end.setDate(end.getDate() + 1);
      running = await User.countDocuments({ createdAt: { $lt: end } });
      cumulative.push({
        date: d.toISOString().slice(0, 10),
        total: running
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

    const [items, total] = await Promise.all([
      Comment.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'nickname phone handle')
        .populate('workId', 'title'),
      Comment.countDocuments()
    ]);

    const list = items.map(function (c) {
      return {
        id: c._id.toString(),
        workId: c.workId ? c.workId._id.toString() : '',
        workTitle: c.workId ? c.workId.title : '',
        userId: c.userId ? c.userId._id.toString() : '',
        userName: c.userId ? c.userId.nickname : '',
        userPhone: c.userId ? c.userId.phone : '',
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
    const doc = await Comment.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: '留言不存在' });
    res.json({ ok: true, message: '已删除' });
  })
);

module.exports = router;
