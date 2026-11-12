/**
 * 前端静态资源引用检查：扫描 *.html 的本地 src/href，引不到文件的即报错。
 * 外部 URL（http/CDN）只计数不校验。退出码非零 = CI 失败。
 * 用法（仓根）：node frontend/scripts/check-assets.js
 */
const fs = require('fs');
const path = require('path');

const FRONT = path.resolve(__dirname, '..');
let failures = 0;
let external = 0;

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.html$/i.test(name)) out.push(p);
  }
  return out;
}

const refRe = /(?:src|href)\s*=\s*["']([^"'#?]+)["']/gi;

for (const file of walk(FRONT, [])) {
  const html = fs.readFileSync(file, 'utf8');
  let m;
  const seen = new Set();
  while ((m = refRe.exec(html))) {
    let ref = m[1].trim();
    if (!ref || ref.startsWith('data:') || ref.startsWith('#')) continue;
    if (/^(https?:)?\/\//i.test(ref) || /^[a-z-]+:/i.test(ref)) {
      external += 1;
      continue;
    }
    ref = ref.split('?')[0].split('#')[0];
    if (seen.has(ref)) continue;
    seen.add(ref);
    const abs = path.resolve(path.dirname(file), ref);
    if (!fs.existsSync(abs)) {
      failures += 1;
      console.log('MISSING ' + path.relative(FRONT, file) + ' -> ' + ref);
    }
  }
}

console.log('external refs: ' + external);
console.log(failures === 0 ? 'ASSETS PASS' : 'ASSETS FAIL: ' + failures + ' missing');
process.exit(failures === 0 ? 0 : 1);
