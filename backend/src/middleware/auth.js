const jwt = require('jsonwebtoken');
const config = require('../config');

function getBearerToken(req) {
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return req.query.token || '';
}

function requireAdmin(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ ok: false, message: '请先登录管理员账号' });
  }
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.role !== 'admin') {
      return res.status(403).json({ ok: false, message: '需要管理员权限' });
    }
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(401).json({ ok: false, message: '登录已过期，请重新登录' });
  }
}

module.exports = { getBearerToken, requireAdmin };
