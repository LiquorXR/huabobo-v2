/**
 * 断库回归：服务指向连不上的数据库时，读写接口必须统一 503，不能 500/泄漏内部错误。
 * 用法：DATABASE_URL=postgres://postgres:postgres@127.0.0.1:1/nope node src/index.js &
 *       sleep 8 && node scripts/smoke-offline.js
 */
const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3000';

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log('ok   ' + name);
  } else {
    failures += 1;
    console.log('FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 200) : ''));
  }
}

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* ignore */
  }
  return { status: res.status, data };
}

(async function main() {
  let r = await req('GET', '/api/health');
  check('health 200', r.status === 200, r);
  check('health db disconnected', r.data && r.data.db === 'disconnected', r.data);

  const cases = [
    ['GET', '/api/news', undefined],
    ['GET', '/api/news/zzz', undefined],
    ['GET', '/api/artisans', undefined],
    ['GET', '/api/artisans/!!!', undefined],
    ['GET', '/api/works', undefined],
    ['GET', '/api/works/abc', undefined],
    ['GET', '/api/comments?workId=bad', undefined],
    ['GET', '/api/studio-model-categories', undefined],
    ['GET', '/api/about', undefined],
    ['POST', '/api/users/register', { phone: '13800000000', password: '123456' }],
    ['POST', '/api/users/login', { phone: '13800000000', password: '123456' }],
    ['POST', '/api/works', { userId: 'x', title: 'y' }],
    ['POST', '/api/comments', { workId: 'x', userId: 'y', text: 'z' }],
    ['GET', '/api/engagement?workIds=bad', undefined]
  ];
  for (const [m, p, b] of cases) {
    r = await req(m, p, b);
    check(m + ' ' + p + ' => 503', r.status === 503, r);
  }

  console.log(failures === 0 ? 'OFFLINE PASS' : 'OFFLINE FAIL: ' + failures);
  process.exit(failures === 0 ? 0 : 1);
})().catch(function (e) {
  console.error('OFFLINE ERROR', e);
  process.exit(1);
});
