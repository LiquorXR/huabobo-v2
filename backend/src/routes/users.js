const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Work = require('../models/Work');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const { requireAdmin } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime, publicUrl } = require('../utils/url');
const { uploadUserAvatar } = require('../middleware/upload');

const router = express.Router();

function mapUser(u) {
  const o = u.toJSON ? u.toJSON() : u;
  return {
    id: o.id,
    phone: o.phone,
    nickname: o.nickname,
    handle: o.handle,
    avatar: publicUrl(o.avatar) || o.avatar,
    bio: o.bio,
    type: o.type,
    joinDate: o.joinDate,
    createdAt: formatDateTime(o.createdAt)
  };
}

/** POST /api/users/register — 用户注册（公开） */
router.post(
  '/register',
  requireDb,
  asyncHandler(async function (req, res) {
    const { phone, password, nickname } = req.body || {};
    if (!phone || !password) {
      return res.status(400).json({ ok: false, message: '请填写手机号和密码' });
    }
    const phoneStr = String(phone).trim();
    if (!/^1\d{10}$/.test(phoneStr)) {
      return res.status(400).json({ ok: false, message: '手机号格式不正确' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ ok: false, message: '密码至少 6 位' });
    }

    const exists = await User.findOne({ phone: phoneStr });
    if (exists) {
      return res.status(409).json({ ok: false, message: '该手机号已注册' });
    }

    const nick = (nickname || '新用户').trim();
    const hash = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      phone: phoneStr,
      passwordHash: hash,
      nickname: nick,
      handle: '@' + nick,
      joinDate: new Date().toISOString().slice(0, 7),
      bio: '指间塑新成员，期待你的第一件 DIY 作品。'
    });

    res.status(201).json({ ok: true, userId: user._id.toString(), user: mapUser(user) });
  })
);

/** POST /api/users/login — 用户登录（公开，供前端对接） */
router.post(
  '/login',
  requireDb,
  asyncHandler(async function (req, res) {
    const { phone, password } = req.body || {};
    if (!phone || !password) {
      return res.status(400).json({ ok: false, message: '请填写手机号和密码' });
    }
    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user) {
      return res.status(401).json({ ok: false, message: '账号或密码错误' });
    }
    const match = await bcrypt.compare(String(password), user.passwordHash);
    if (!match) {
      return res.status(401).json({ ok: false, message: '账号或密码错误' });
    }
    res.json({ ok: true, userId: user._id.toString(), user: mapUser(user) });
  })
);

/** POST /api/users/:id/avatar — 上传头像（本人，multipart: avatar） */
router.post(
  '/:id/avatar',
  requireDb,
  function (req, res, next) {
    uploadUserAvatar.single('avatar')(req, res, function (err) {
      if (err) {
        return res.status(400).json({ ok: false, message: err.message || '上传失败' });
      }
      next();
    });
  },
  asyncHandler(async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ ok: false, message: '用户不存在' });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, message: '请选择图片' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: '用户不存在' });
    user.avatar = '/uploads/users/' + req.file.filename;
    await user.save();
    res.json({ ok: true, data: mapUser(user) });
  })
);

/** PATCH/POST /api/users/:id/profile — 修改昵称 */
async function updateUserProfile(req, res) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ ok: false, message: '用户不存在' });
  }
  const { nickname } = req.body || {};
  const nick = String(nickname || '').trim();
  if (!nick) {
    return res.status(400).json({ ok: false, message: '昵称不能为空' });
  }
  if (nick.length > 20) {
    return res.status(400).json({ ok: false, message: '昵称最多 20 字' });
  }
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ ok: false, message: '用户不存在' });
  user.nickname = nick;
  user.handle = '@' + nick;
  await user.save();
  res.json({ ok: true, data: mapUser(user) });
}

router.patch('/:id/profile', requireDb, asyncHandler(updateUserProfile));
router.post('/:id/profile', requireDb, asyncHandler(updateUserProfile));

/** GET /api/users/:id — 用户公开资料（供个人主页） */
router.get(
  '/:id',
  asyncHandler(async function (req, res) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ ok: false, message: '用户不存在' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: '用户不存在' });
    res.json({ ok: true, data: mapUser(user) });
  })
);

const admin = express.Router();
admin.use(requireAdmin);
admin.use(requireDb);

/** GET /api/admin/users — 用户列表 */
admin.get(
  '/',
  asyncHandler(async function (req, res) {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const keyword = (req.query.keyword || '').trim();

    const filter = {};
    if (keyword) {
      filter.$or = [
        { phone: new RegExp(keyword, 'i') },
        { nickname: new RegExp(keyword, 'i') }
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({
      ok: true,
      data: {
        list: items.map(mapUser),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1
      }
    });
  })
);

/** DELETE /api/admin/users/:id */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: '用户不存在' });
    await Work.deleteMany({ userId: user._id });
    await Comment.deleteMany({ userId: user._id });
    await Like.deleteMany({ userId: user._id });
    res.json({ ok: true, message: '用户已删除' });
  })
);

/** PATCH /api/admin/users/:id/password — 修改密码 */
admin.patch(
  '/:id/password',
  asyncHandler(async function (req, res) {
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ ok: false, message: '新密码至少 6 位' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ ok: false, message: '用户不存在' });
    user.passwordHash = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    res.json({ ok: true, message: '密码已更新' });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
