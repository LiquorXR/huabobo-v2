const { isDbReady, provider } = require('../db/client');

function requireDb(req, res, next) {
  if (isDbReady()) return next();
  const hint =
    provider() === 'pg'
      ? '请在服务器检查 PostgreSQL 是否启动，并确认 .env 中 DATABASE_URL 正确'
      : '请确认本地 dev.db 可写（或 .env 中 DATABASE_URL 正确）';
  return res.status(503).json({
    ok: false,
    message: '数据库未连接，无法保存。' + hint
  });
}

module.exports = requireDb;
