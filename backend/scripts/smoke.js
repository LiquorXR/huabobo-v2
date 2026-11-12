/**
 * CI / 本地冒烟回归：覆盖核心链路，任一断言失败即非零退出。
 * 用法：先启动服务（DATABASE_URL=file:./dev.db），再 node scripts/smoke.js
 *   npm run seed && (node src/index.js &>/tmp/srv.log & echo $! > /tmp/srv.pid) && sleep 6 && node scripts/smoke.js; code=$?; kill $(cat /tmp/srv.pid); exit $code
 */
const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3000';

let failures = 0;
function check(name, cond, extra) {
  if (cond) {
    console.log('ok   ' + name);
  } else {
    failures += 1;
    console.log('FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra).slice(0, 300) : ''));
  }
}

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
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
  const username = 'ci' + String(Date.now()).slice(-8);

  let r = await req('GET', '/api/health');
  check('health 200', r.status === 200, r);
  check('health db connected', r.data && r.data.db === 'connected', r.data);

  r = await req('GET', '/api/news');
  check('news list 200 + seeded', r.status === 200 && r.data.data && r.data.data.total >= 3, r.data);

  r = await req('GET', '/api/news/zzz');
  check('news bad id 404', r.status === 404, r);

  r = await req('GET', '/api/artisans');
  check('artisans list 200 + seeded', r.status === 200 && Array.isArray(r.data.data) && r.data.data.length >= 3, r.data);

  r = await req('GET', '/api/studio-model-categories');
  const cats = (r.data.data && r.data.data.list) || [];
  check('categories 200 + seeded', r.status === 200 && cats.length >= 1, r.data);

  if (cats.length) {
    r = await req('GET', '/api/studio-models?categoryId=' + encodeURIComponent(cats[0].id));
    check('studio-models 200', r.status === 200 && r.data.data && Array.isArray(r.data.data.list), r.data);
  }
  r = await req('GET', '/api/studio-models');
  check('studio-models no categoryId 400', r.status === 400, r);

  r = await req('POST', '/api/users/register', { username, password: '123456', nickname: 'CI' });
  check('register 201', r.status === 201 && !!r.data.userId, r);
  const uid = r.data.userId;

  r = await req('POST', '/api/users/login', { username, password: '123456' });
  check('login 200', r.status === 200 && r.data.userId === uid, r);

  r = await req('GET', '/api/users/' + uid);
  check('get user 200', r.status === 200 && r.data.data && r.data.data.nickname === 'CI', r.data);

  r = await req('POST', '/api/works', { userId: 'nope', title: 'x' });
  check('works bad userId 400', r.status === 400, r);

  r = await req('POST', '/api/works', { userId: uid, title: 'CI作品', publish: true });
  check('create work 201', r.status === 201 && !!(r.data.data && r.data.data.id), r);
  const wid = r.data.data && r.data.data.id;

  r = await req('GET', '/api/works?limit=5');
  check('works list 200', r.status === 200 && r.data.data && Array.isArray(r.data.data.list), r.data);

  r = await req('GET', '/api/works/' + wid);
  check('get work 200', r.status === 200 && r.data.data && r.data.data.title === 'CI作品', r.data);

  r = await req('GET', '/api/engagement?workIds=' + wid + '&viewerId=' + uid);
  check('engagement 200', r.status === 200 && !!(r.data.data && r.data.data[wid]), r.data);

  r = await req('POST', '/api/comments', { workId: wid, userId: uid, text: 'CI好评' });
  check('comment 201', r.status === 201 && r.data.ok === true, r);

  r = await req('POST', '/api/engagement/like', { workId: wid, userId: uid });
  check('like true', r.status === 200 && r.data.liked === true, r);
  r = await req('POST', '/api/engagement/like', { workId: wid, userId: uid });
  check('like toggle false', r.status === 200 && r.data.liked === false, r);

  r = await req('DELETE', '/api/works/' + wid + '?userId=' + uid);
  check('delete work 200', r.status === 200 && r.data.ok === true, r);
  r = await req('GET', '/api/works/' + wid);
  check('deleted work 404', r.status === 404, r);

  r = await req('POST', '/api/admin/login', { username: 'admin', password: 'WRONG' });
  check('admin wrong pass 401', r.status === 401, r);

  r = await req('POST', '/api/tts/speak', { text: '' });
  check('tts empty text 400', r.status === 400, r);
  if (!process.env.DOUBAO_TTS_API_KEY) {
    r = await req('POST', '/api/tts/speak', { text: '你好' });
    check('tts unconfigured 503', r.status === 503, r);
  }

  const ADMIN_USER = process.env.SMOKE_ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.SMOKE_ADMIN_PASS || 'zhijiansu@admin';
  r = await req('POST', '/api/admin/login', { username: ADMIN_USER, password: ADMIN_PASS });
  check('admin login 200', r.status === 200 && !!r.data.token, r);
  const token = r.data.token;
  async function reqForm(method, path, fields, files) {
    const fd = new FormData();
    for (const k of Object.keys(fields || {})) fd.append(k, fields[k]);
    for (const k of Object.keys(files || {})) {
      const f = files[k];
      fd.append(k, new Blob([f.data], { type: f.type }), f.filename);
    }
    const res = await fetch(BASE + path, {
      method,
      headers: { Authorization: 'Bearer ' + token },
      body: fd
    });
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* ignore */
    }
    return { status: res.status, data };
  }

  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  const DATA_URL_PNG = 'data:image/png;base64,' + PNG.toString('base64');

  r = await req('GET', '/api/admin/dashboard', undefined, token);
  check('dashboard 200', r.status === 200 && r.data.data && typeof r.data.data.totalUsers === 'number', r.data);

  r = await req('POST', '/api/admin/studio-model-categories', { name: 'CI分类' }, token);
  check('category create 201', r.status === 201 && !!(r.data.data && r.data.data.id), r);
  const cid = r.data.data && r.data.data.id;
  r = await req('POST', '/api/admin/studio-model-categories', { name: 'CI分类' }, token);
  check('category duplicate 400', r.status === 400, r);

  r = await reqForm('POST', '/api/admin/studio-models',
    { name: 'CI模型', categoryId: cid, sortOrder: '1' },
    { glb: { data: Buffer.from('ci-fake-glb'), type: 'application/octet-stream', filename: 'ci.glb' } });
  check('model upload 201', r.status === 201 && !!(r.data.data && r.data.data.glbUrl), r);
  const mid = r.data.data && r.data.data.id;
  check('model glb path', !!(r.data.data && r.data.data.glbUrl.indexOf('/uploads/models/') >= 0), r.data);

  r = await req('POST', '/api/studio-models/' + mid + '/thumbnail', { thumbnailBase64: DATA_URL_PNG }, token);
  check('model thumbnail 200', r.status === 200, r);

  r = await req('POST', '/api/admin/artisans', { name: 'CI艺人' }, token);
  check('artisan create 201', r.status === 201 && !!(r.data.data && r.data.data.id), r);
  const aid = r.data.data && r.data.data.id;

  r = await req('POST', '/api/admin/news', { title: 'CI新闻', summary: 's', content: 'c' }, token);
  check('news create 201', r.status === 201 && !!(r.data.data && r.data.data.id), r);
  const nid = r.data.data && r.data.data.id;

  r = await req('GET', '/api/about');
  const origHero = r.data.data && r.data.data.heroTitle;
  r = await req('PUT', '/api/admin/about', { heroTitle: 'CI关于' }, token);
  check('about update 200', r.status === 200 && r.data.data && r.data.data.heroTitle === 'CI关于', r.data);
  await req('PUT', '/api/admin/about', { heroTitle: origHero }, token);

  r = await reqForm('POST', '/api/users/' + uid + '/avatar', {}, {
    avatar: { data: PNG, type: 'image/png', filename: 'a.png' }
  });
  check('avatar upload 200', r.status === 200, r);

  r = await reqForm('POST', '/api/works',
    { userId: uid, title: 'CI封面作品', publish: '1', workType: 'model' },
    { cover: { data: PNG, type: 'image/png', filename: 'cover.png' } });
  check('work cover upload 201', r.status === 201, r);
  const wid2 = r.data.data && r.data.data.id;
  check('work cover path', !!(r.data.data && r.data.data.image.indexOf('/uploads/') >= 0), r.data);
  r = await req('DELETE', '/api/works/' + wid2 + '?userId=' + uid);
  check('delete cover work 200', r.status === 200, r);

  r = await req('DELETE', '/api/admin/studio-models/' + mid, undefined, token);
  check('model delete 200', r.status === 200, r);
  r = await req('DELETE', '/api/admin/studio-model-categories/' + cid, undefined, token);
  check('category delete 200', r.status === 200, r);
  r = await req('DELETE', '/api/admin/artisans/' + aid, undefined, token);
  check('artisan delete 200', r.status === 200, r);
  r = await req('DELETE', '/api/admin/news/' + nid, undefined, token);
  check('news delete 200', r.status === 200, r);
  r = await req('DELETE', '/api/admin/users/' + uid, undefined, token);
  check('cleanup CI user 200', r.status === 200, r);
  r = await req('POST', '/api/users/login', { username, password: '123456' });
  check('deleted user login 401', r.status === 401, r);

  console.log(failures === 0 ? 'SMOKE PASS' : 'SMOKE FAIL: ' + failures);
  process.exit(failures === 0 ? 0 : 1);
})().catch(function (e) {
  console.error('SMOKE ERROR', e);
  process.exit(1);
});
