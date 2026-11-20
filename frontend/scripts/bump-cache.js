/**
 * 自动发布时刷新前端缓存键：把已有的 `?v=xxx` 统一换成部署 BUILD_ID，
 * 并同步 `js/api-config.js` 里的 `BUILD`（目前仅展示用，真正防缓存的是 HTML 里的 ?v）。
 *
 * 只改已有 ?v 的引用，不给无 ?v 的文件加新参数（保持手动规范）。
 * 幂等：重复跑同一个 BUILD_ID 结果不变。
 *
 * 用法：
 *   node frontend/scripts/bump-cache.js 20261121-abcdef1
 *   node frontend/scripts/bump-cache.js --check   # 仅检查脚本自身语法？直接 node --check 即可
 */
const fs = require('fs');
const path = require('path');

const FRONT = path.resolve(__dirname, '..');
const BUILD_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function collectHtmlFiles(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) collectHtmlFiles(p, out);
    else if (/\.html$/i.test(name)) out.push(p);
  }
  return out;
}

function main() {
  const buildId = (process.argv[2] || '').trim();
  if (!BUILD_ID_RE.test(buildId)) {
    console.error('用法: node frontend/scripts/bump-cache.js <BUILD_ID>  (如 20261121-abcdef1)');
    process.exit(1);
  }
  let changed = 0;

  // 1) HTML 里已有的 ?v=xxx -> ?v=BUILD_ID（含 studio.html 内联的 studio.js?v=）
  for (const file of collectHtmlFiles(FRONT, [])) {
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(/\?v=[A-Za-z0-9._-]+/g, '?v=' + buildId);
    if (after !== before) {
      fs.writeFileSync(file, after);
      changed += 1;
      console.log('bump ' + path.relative(FRONT, file));
    }
  }

  // 2) js/studio.js 里的模块内联 ?v（import ... avatar-human.js?v=）
  const studioJs = path.join(FRONT, 'js', 'studio.js');
  if (fs.existsSync(studioJs)) {
    const before = fs.readFileSync(studioJs, 'utf8');
    const after = before.replace(/\?v=[A-Za-z0-9._-]+/g, '?v=' + buildId);
    if (after !== before) {
      fs.writeFileSync(studioJs, after);
      changed += 1;
      console.log('bump js/studio.js');
    }
  }

  // 3) api-config.js 的 BUILD（展示用，与 ?v 保持一致方便排查）
  const apiConfig = path.join(FRONT, 'js', 'api-config.js');
  if (fs.existsSync(apiConfig)) {
    const before = fs.readFileSync(apiConfig, 'utf8');
    const after = before.replace(/var BUILD = '[^']*';/, "var BUILD = '" + buildId + "';");
    if (after !== before) {
      fs.writeFileSync(apiConfig, after);
      changed += 1;
      console.log('bump js/api-config.js BUILD');
    }
  }

  console.log('BUILD_ID=' + buildId + ' files changed: ' + changed);
}

main();
