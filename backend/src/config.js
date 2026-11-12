require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');

/** 管理员账号固定写在程序内（也可用环境变量覆盖） */
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'zhijiansu@admin';

/** 上传目录：建议生产环境用绝对路径，避免更新代码时 uploads 被覆盖 */
const defaultUploadDir = path.join(__dirname, '..', 'uploads');

function dirIsWritable(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    var probe = path.join(dir, '.write-probe');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    return true;
  } catch (e) {
    return false;
  }
}

function resolveUploadDir() {
  var requested = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : defaultUploadDir;
  var candidates = [requested, defaultUploadDir, path.join(os.tmpdir(), 'zhijiansu-uploads')];
  var seen = {};
  for (var i = 0; i < candidates.length; i++) {
    var dir = candidates[i];
    if (!dir || seen[dir]) continue;
    seen[dir] = true;
    if (dirIsWritable(dir)) {
      if (dir !== requested) {
        console.warn(
          '[config] UPLOAD_DIR 无写权限: ' +
            requested +
            '，已改用 ' +
            dir +
            '。若要用系统目录，请以 root 执行: mkdir -p ' +
            requested +
            ' && chown -R $(运行 Node 的用户) ' +
            requested
        );
      }
      return dir;
    }
  }
  console.warn('[config] 未能创建可写上传目录，将使用 ' + defaultUploadDir);
  return defaultUploadDir;
}

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  /** postgres://user:pass@host:5432/db（生产） 或 file:./dev.db（本地 SQLite，相对 backend/ 目录） */
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'zhijiansu-dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  adminUsername: ADMIN_USERNAME,
  adminPassword: ADMIN_PASSWORD,
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, ''),
  /** 前端静态站地址（用于 news/artisan 等 images/ 路径在管理后台显示） */
  frontendBaseUrl: (process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:8765').replace(/\/$/, ''),
  uploadDir: resolveUploadDir()
};
