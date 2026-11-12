const express = require('express');
const bcrypt = require('bcryptjs');
const { eq, and, desc, sql } = require('drizzle-orm');
const dbm = require('../db/client');
const { newId, nowMs } = require('../db/helpers');
const { requireAdmin } = require('../middleware/auth');
const requireDb = require('../middleware/requireDb');
const asyncHandler = require('../utils/asyncHandler');
const { formatDateTime, publicUrl } = require('../utils/url');
const { uploadUserAvatar } = require('../middleware/upload');

const router = express.Router();

function mapUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    phone: u.phone,
    nickname: u.nickname,
    handle: u.handle,
    avatar: publicUrl(u.avatar) || u.avatar,
    bio: u.bio,
    type: u.type,
    joinDate: u.joinDate,
    createdAt: formatDateTime(u.createdAt)
  };
}

function escapeLike(s) {
  return String(s).replace(/[\\%_]/g, function (c) {
    return '\\' + c;
  });
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

    const { users } = dbm.schema;
    const exists = await dbm.db.select().from(users).where(eq(users.phone, phoneStr)).limit(1);
    if (exists.length) {
      return res.status(409).json({ ok: false, message: '该手机号已注册' });
    }

    const nick = (nickname || '新用户').trim();
    const hash = await bcrypt.hash(String(password), 10);
    const now = nowMs();
    const row = {
      id: newId(),
      phone: phoneStr,
      passwordHash: hash,
      nickname: nick,
      handle: '@' + nick,
      avatar: 'images/author-user-me.jpg',
      bio: '指间塑新成员，期待你的第一件 DIY 作品。',
      type: 'member',
      joinDate: new Date().toISOString().slice(0, 7),
      createdAt: now,
      updatedAt: now
    };
    await dbm.db.insert(users).values(row);

    res.status(201).json({ ok: true, userId: row.id, user: mapUser(row) });
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
    const { users } = dbm.schema;
    const rows = await dbm.db
      .select()
      .from(users)
      .where(eq(users.phone, String(phone).trim()))
      .limit(1);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ ok: false, message: '账号或密码错误' });
    }
    const match = await bcrypt.compare(String(password), user.passwordHash);
    if (!match) {
      return res.status(401).json({ ok: false, message: '账号或密码错误' });
    }
    res.json({ ok: true, userId: user.id, user: mapUser(user) });
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
    if (!req.file) {
      return res.status(400).json({ ok: false, message: '请选择图片' });
    }
    const { users } = dbm.schema;
    const rows = await dbm.db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    const user = rows[0];
    if (!user) return res.status(404).json({ ok: false, message: '用户不存在' });
    const avatar = '/uploads/users/' + req.file.filename;
    await dbm.db
      .update(users)
      .set({ avatar: avatar, updatedAt: nowMs() })
      .where(eq(users.id, user.id));
    res.json({ ok: true, data: mapUser(Object.assign({}, user, { avatar: avatar })) });
  })
);

/** PATCH/POST /api/users/:id/profile — 修改昵称 */
async function updateUserProfile(req, res) {
  const { nickname } = req.body || {};
  const nick = String(nickname || '').trim();
  if (!nick) {
    return res.status(400).json({ ok: false, message: '昵称不能为空' });
  }
  if (nick.length > 20) {
    return res.status(400).json({ ok: false, message: '昵称最多 20 字' });
  }
  const { users } = dbm.schema;
  const rows = await dbm.db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  const user = rows[0];
  if (!user) return res.status(404).json({ ok: false, message: '用户不存在' });
  await dbm.db
    .update(users)
    .set({ nickname: nick, handle: '@' + nick, updatedAt: nowMs() })
    .where(eq(users.id, user.id));
  res.json({ ok: true, data: mapUser(Object.assign({}, user, { nickname: nick, handle: '@' + nick })) });
}

router.patch('/:id/profile', requireDb, asyncHandler(updateUserProfile));
router.post('/:id/profile', requireDb, asyncHandler(updateUserProfile));

/** GET /api/users/:id — 用户公开资料（供个人主页） */
router.get(
  '/:id',
  requireDb,
  asyncHandler(async function (req, res) {
    const { users } = dbm.schema;
    const rows = await dbm.db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    const user = rows[0];
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
    const { users } = dbm.schema;

    const conds = [];
    if (keyword) {
      const pattern = '%' + escapeLike(keyword.toLowerCase()) + '%';
      conds.push(
        sql`(${sql`lower(${users.phone})`} LIKE ${pattern} ESCAPE '\\' OR ${sql`lower(${users.nickname})`} LIKE ${pattern} ESCAPE '\\')`
      );
    }
    const where = conds.length ? and(...conds) : undefined;

    const [items, totalRows] = await Promise.all([
      dbm.db
        .select()
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(skip),
      dbm.db
        .select({ n: sql`count(*)`.mapWith(Number) })
        .from(users)
        .where(where)
    ]);
    const total = totalRows[0] ? totalRows[0].n : 0;

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

/** DELETE /api/admin/users/:id — 删除用户（作品/留言/点赞由外键级联删除） */
admin.delete(
  '/:id',
  asyncHandler(async function (req, res) {
    const { users } = dbm.schema;
    const rows = await dbm.db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ ok: false, message: '用户不存在' });
    await dbm.db.delete(users).where(eq(users.id, req.params.id));
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
    const { users } = dbm.schema;
    const rows = await dbm.db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
    if (!rows.length) return res.status(404).json({ ok: false, message: '用户不存在' });
    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    await dbm.db
      .update(users)
      .set({ passwordHash: passwordHash, updatedAt: nowMs() })
      .where(eq(users.id, req.params.id));
    res.json({ ok: true, message: '密码已更新' });
  })
);

module.exports = { publicRouter: router, adminRouter: admin };
