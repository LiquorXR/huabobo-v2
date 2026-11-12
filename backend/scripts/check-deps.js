/**
 * 启动前检查 Node 版本与依赖是否已安装（better-sqlite3 v13 要求 Node >= 22，
 * 版本不对会直接段错误退出码 139，先在这里拦下给明确提示）
 */
var major = parseInt(process.versions.node.split('.')[0], 10) || 0;
if (major < 22) {
  console.error('');
  console.error('【启动失败】需要 Node.js >= 22，当前 ' + process.version);
  console.error('请升级 Node（nvm install 22 && nvm use 22），再执行 npm install');
  console.error('');
  process.exit(1);
}

var required = ['express', 'pg', 'better-sqlite3', 'drizzle-orm', 'cors', 'dotenv', 'jsonwebtoken', 'bcryptjs', 'morgan', 'multer', 'marked'];
var missing = [];

required.forEach(function (name) {
  try {
    require.resolve(name);
  } catch (e) {
    missing.push(name);
  }
});

if (missing.length) {
  console.error('');
  console.error('【启动失败】缺少依赖模块:', missing.join(', '));
  console.error('');
  console.error('请在项目根目录（含 package.json 的目录）执行：');
  console.error('');
  console.error('  cd /www/wwwroot/nodejs');
  console.error('  npm install');
  console.error('');
  console.error('然后再执行: npm start');
  console.error('');
  process.exit(1);
}
