const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..', 'assets', 'model-library');
const bin = path.resolve(__dirname, '..', 'node_modules', '.bin', 'gltf-transform' + (process.platform === 'win32' ? '.cmd' : ''));

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.glb$/i.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(root, []);
let total0 = 0, total1 = 0, ok = 0, fail = [];
for (const f of files) {
  const tmp = f + '.opt.tmp.glb';
  try {
    execFileSync(bin, ['optimize', f, tmp, '--compress', 'quantize'], { stdio: 'pipe', timeout: 300000, shell: process.platform === 'win32' });
    const a = fs.statSync(f).size, b = fs.statSync(tmp).size;
    if (b > 0 && b < a) {
      fs.renameSync(tmp, f);
      total0 += a; total1 += b; ok++;
      console.log('ok ' + path.relative(root, f) + ' ' + (a / 1048576).toFixed(1) + 'MB -> ' + (b / 1048576).toFixed(1) + 'MB');
    } else {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      console.log('skip (not smaller) ' + path.relative(root, f));
    }
  } catch (e) {
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (e2) {}
    fail.push(f);
    console.log('FAIL ' + path.relative(root, f) + ' ' + String((e && e.message) || e).slice(0, 120));
  }
}
console.log('DONE ok=' + ok + ' fail=' + fail.length + ' total ' + (total0 / 1048576).toFixed(1) + 'MB -> ' + (total1 / 1048576).toFixed(1) + 'MB');
