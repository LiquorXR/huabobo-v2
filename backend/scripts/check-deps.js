/**
 * 启动前检查依赖是否已安装
 */
var required = ['express', 'mongoose', 'cors', 'dotenv', 'jsonwebtoken', 'bcryptjs', 'morgan', 'multer'];
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
