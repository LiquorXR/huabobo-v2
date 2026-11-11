const { isDbReady } = require('../db');

function requireDb(req, res, next) {
  if (isDbReady()) return next();
  return res.status(503).json({
    ok: false,
    message: '数据库未连接，无法保存。请在服务器检查 MongoDB 是否启动，并确认 .env 中 MONGODB_URI 正确'
  });
}

module.exports = requireDb;
