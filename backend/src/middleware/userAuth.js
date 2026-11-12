const jwt = require('jsonwebtoken');
const config = require('../config');
const { getBearerToken } = require('./auth');

/**
 * 普通用户鉴权：登录/注册成功后服务端签发 JWT（见 routes/auth.js），
 * 后续写操作必须携带 Authorization: Bearer <token>。
 * 通过后 req.userId 为 token 内用户 id，后续 handler 一律以它为准，
 * 忽略客户端传来的 userId（防 IDOR）。
 */
function requireUser(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, message: '请先登录' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (!payload || payload.type !== 'user' || !payload.sub) {
      return res.status(401).json({ ok: false, message: '请先登录' });
    }
    req.userId = String(payload.sub);
    req.userToken = payload;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: '登录已过期，请重新登录' });
  }
}

module.exports = { requireUser };
