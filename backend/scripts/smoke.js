/**
 * CI / 本地冒烟回归：覆盖核心链路，任一断言失败即非零退出。
 * 用法：先启动服务（DATABASE_URL=file:./dev.db），再 node scripts/smoke.js
 *   npm run seed && (node src/index.js &>/tmp/srv.log & echo $! > /tmp/srv.pid) && sleep 6 && node scripts/smoke.js; code=$?; kill $(cat /tmp/srv.pid); exit $code
 */
const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3000';
const fs = require('fs');
const path = require('path');

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
  check('register returns token', !!r.data.token, r.data && { hasToken: !!r.data.token });

  r = await req('POST', '/api/users/login', { username, password: '123456' });
  check('login 200', r.status === 200 && r.data.userId === uid, r);
  const utoken = r.data.token;
  check('login returns token', !!utoken, { hasToken: !!utoken });

  r = await req('POST', '/api/works', { title: 'x' });
  check('works no token 401', r.status === 401, r);
  r = await req('POST', '/api/comments', { workId: 'x', text: 'y' });
  check('comments no token 401', r.status === 401, r);
  r = await req('POST', '/api/engagement/like', { workId: 'x', userId: uid });
  check('like no token 401', r.status === 401, r);
  r = await req('PATCH', '/api/users/' + uid + '/profile', { nickname: 'Hacker' });
  check('profile no token 401', r.status === 401, r);

  r = await req('GET', '/api/users/' + uid);
  check('get user 200', r.status === 200 && r.data.data && r.data.data.nickname === 'CI', r.data);

  r = await req('POST', '/api/works', { userId: 'forged-id', title: 'CI作品', publish: true }, utoken);
  check('create work 201', r.status === 201 && !!(r.data.data && r.data.data.id), r);
  const wid = r.data.data && r.data.data.id;

  r = await req('GET', '/api/works?limit=5');
  check('works list 200', r.status === 200 && r.data.data && Array.isArray(r.data.data.list), r.data);

  r = await req('GET', '/api/works/' + wid, undefined, utoken);
  check('get work 200', r.status === 200 && r.data.data && r.data.data.title === 'CI作品', r.data);
  check('forged userId ignored, owner is token user', r.data.data && r.data.data.userId === uid, r.data.data);

  r = await req('GET', '/api/engagement?workIds=' + wid + '&viewerId=' + uid);
  check('engagement 200', r.status === 200 && !!(r.data.data && r.data.data[wid]), r.data);

  r = await req('POST', '/api/comments', { workId: wid, text: 'CI好评' }, utoken);
  check('comment 201', r.status === 201 && r.data.ok === true, r);

  r = await req('POST', '/api/engagement/like', { workId: wid }, utoken);
  check('like true', r.status === 200 && r.data.liked === true, r);
  r = await req('POST', '/api/engagement/like', { workId: wid }, utoken);
  check('like toggle false', r.status === 200 && r.data.liked === false, r);

  r = await req('DELETE', '/api/works/' + wid, undefined, utoken);
  check('delete work 200', r.status === 200 && r.data.ok === true, r);
  r = await req('GET', '/api/works/' + wid);
  check('deleted work 404', r.status === 404, r);

  r = await req('POST', '/api/admin/login', { username: 'admin', password: 'WRONG' });
  check('admin wrong pass 401', r.status === 401, r);

  r = await req('POST', '/api/tts/speak', { text: '' });
  check('tts empty text 400', r.status === 400, r);
  if (!process.env.OPENAI_API_KEY && !process.env.ZHIPU_API_KEY) {
    r = await req('POST', '/api/tts/speak', { text: '你好' });
    check('tts unconfigured 503', r.status === 503, r);
  }

  r = await req('POST', '/api/vision/identify', { image: 'nope' });
  check('vision bad image 400', r.status === 400, r);
  r = await req('POST', '/api/review/text', { context: 'not-an-object' });
  check('review bad context 400', r.status === 400, r);
  if (!process.env.OPENAI_API_KEY && !process.env.ZHIPU_API_KEY && !process.env.ARK_API_KEY) {
    r = await req('POST', '/api/vision/identify', { image: 'data:image/jpeg;base64,/9j/' });
    check('vision unconfigured 503', r.status === 503, r);
    r = await req('POST', '/api/review/text', { context: { kind: 'real', motifs: ['tao'] } });
    check('review unconfigured 503', r.status === 503, r);
  }

  const ADMIN_USER = process.env.SMOKE_ADMIN_USER || 'admin';
  const ADMIN_PASS = process.env.SMOKE_ADMIN_PASS || 'zhijiansu@admin';
  r = await req('POST', '/api/admin/login', { username: ADMIN_USER, password: ADMIN_PASS });
  check('admin login 200', r.status === 200 && !!r.data.token, r);
  const token = r.data.token;
  async function reqForm(method, path, fields, files, tok) {
    const fd = new FormData();
    for (const k of Object.keys(fields || {})) fd.append(k, fields[k]);
    for (const k of Object.keys(files || {})) {
      const f = files[k];
      fd.append(k, new Blob([f.data], { type: f.type }), f.filename);
    }
    const res = await fetch(BASE + path, {
      method,
      headers: { Authorization: 'Bearer ' + (tok || token) },
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

  const catName = 'CI分类' + String(Date.now()).slice(-6);
  r = await req('POST', '/api/admin/studio-model-categories', { name: catName }, token);
  check('category create 201', r.status === 201 && !!(r.data.data && r.data.data.id), r);
  const cid = r.data.data && r.data.data.id;
  r = await req('POST', '/api/admin/studio-model-categories', { name: catName }, token);
  check('category duplicate 400', r.status === 400, r);

  r = await reqForm('POST', '/api/admin/studio-models',
    { name: 'CI模型', categoryId: cid, sortOrder: '1' },
    { glb: { data: Buffer.from('ci-fake-glb'), type: 'application/octet-stream', filename: 'ci.glb' } });
  check('model upload 201', r.status === 201 && !!(r.data.data && r.data.data.glbUrl), r);
  const mid = r.data.data && r.data.data.id;
  check('model glb path', !!(r.data.data && r.data.data.glbUrl.indexOf('/uploads/models/') >= 0), r.data);

  r = await req('POST', '/api/studio-models/' + mid + '/thumbnail', { thumbnailBase64: DATA_URL_PNG }, utoken);
  check('model thumbnail 200 (user token)', r.status === 200, r);
  r = await req('POST', '/api/studio-models/' + mid + '/thumbnail', { thumbnailBase64: DATA_URL_PNG });
  check('model thumbnail no token 401', r.status === 401, r);

  // 数字人管理：真实 GLB、单活、背景、性别与删除
  const humanGlb = fs.readFileSync(
    path.join(__dirname, '..', '..', 'frontend', 'models', 'avatar', 'shaded.glb')
  );
  const humanFiles = {
    glb: { data: humanGlb, type: 'model/gltf-binary', filename: 'shaded.glb' }
  };
  r = await req('GET', '/api/digital-humans/active');
  check('digital human active public 200', r.status === 200 && r.data && r.data.ok === true, r.data);
  const initialActiveId = r.data && r.data.data ? r.data.data.id : '';

  r = await reqForm('POST', '/api/admin/digital-humans', { name: 'CI数字人' }, {
    glb: { data: Buffer.from('not-a-glb'), type: 'application/octet-stream', filename: 'bad.glb' }
  }, 'bad-token');
  check('digital human admin requires token 401', r.status === 401, r.status);

  r = await reqForm('POST', '/api/admin/digital-humans', { name: '坏模型' }, {
    glb: { data: Buffer.from('not-a-glb'), type: 'application/octet-stream', filename: 'bad.glb' }
  });
  check('digital human invalid glb 400', r.status === 400, r);

  r = await reqForm('POST', '/api/admin/digital-humans', {
    name: 'CI女数字人',
    gender: 'female',
    backgroundType: 'color',
    backgroundColor: '#f3ebe0',
    enabled: 'true'
  }, humanFiles);
  check(
    'digital human create 201 + rig detected',
    r.status === 201 && r.data.data && r.data.data.enabled === true &&
      r.data.data.rigInfo && r.data.data.rigInfo.boneCount >= 20,
    r.data
  );
  const humanF = r.data.data && r.data.data.id;

  r = await req('GET', '/api/digital-humans/active');
  check(
    'digital human active returns created',
    r.status === 200 && r.data.data && r.data.data.id === humanF && r.data.data.gender === 'female',
    r.data
  );

  r = await reqForm('POST', '/api/admin/digital-humans', {
    name: 'CI男数字人',
    gender: 'male',
    backgroundType: 'image',
    backgroundColor: '#dde8f0',
    enabled: 'true'
  }, {
    glb: humanFiles.glb,
    backgroundImage: { data: PNG, type: 'image/png', filename: 'bg.png' }
  });
  check(
    'digital human second create + image bg',
    r.status === 201 && r.data.data && r.data.data.background.type === 'image' &&
      r.data.data.background.image.indexOf('/uploads/digital-humans/backgrounds/') >= 0,
    r.data
  );
  const humanM = r.data.data && r.data.data.id;

  r = await req('GET', '/api/digital-humans/active');
  check('digital human single active switches', r.status === 200 && r.data.data && r.data.data.id === humanM, r.data);

  r = await reqForm('PUT', '/api/admin/digital-humans/' + humanM, {
    name: 'CI男数字人改',
    gender: 'female',
    backgroundType: 'color',
    backgroundColor: '#112233',
    enabled: 'true'
  }, {});
  check(
    'digital human update 200',
    r.status === 200 && r.data.data && r.data.data.name === 'CI男数字人改' &&
      r.data.data.gender === 'female' && r.data.data.background.type === 'color',
    r.data
  );

  r = await req('POST', '/api/admin/digital-humans/' + humanF + '/activate', undefined, token);
  check('digital human activate 200', r.status === 200 && r.data.data && r.data.data.enabled === true, r.data);
  r = await req('GET', '/api/digital-humans/active');
  check('digital human active after activate', r.status === 200 && r.data.data && r.data.data.id === humanF, r.data);

  r = await req('DELETE', '/api/admin/digital-humans/' + humanF, undefined, token);
  check('digital human delete 200', r.status === 200, r);
  r = await req('DELETE', '/api/admin/digital-humans/' + humanM, undefined, token);
  check('digital human second delete 200', r.status === 200, r);

  if (initialActiveId) {
    r = await req('POST', '/api/admin/digital-humans/' + initialActiveId + '/activate', undefined, token);
    check('digital human initial active restored', r.status === 200, r);
    r = await req('GET', '/api/digital-humans/active');
    check(
      'digital human active restored',
      r.status === 200 && r.data.data && r.data.data.id === initialActiveId,
      r.data
    );
  } else {
    r = await req('GET', '/api/digital-humans/active');
    check('digital human active null after delete', r.status === 200 && r.data.data === null, r.data);
  }

  r = await req('PATCH', '/api/users/' + uid + '/profile', { nickname: 'CI2' }, utoken);
  check('profile update own 200', r.status === 200 && r.data.data && r.data.data.nickname === 'CI2', r.data);

  // 跨用户越权：注册第二个用户，用 B 的 token 操作 A 的资源
  const usernameB = 'cb' + String(Date.now()).slice(-8);
  r = await req('POST', '/api/users/register', { username: usernameB, password: '123456' });
  check('register user B 201', r.status === 201, r);
  const btoken = r.data.token;
  const bid = r.data.userId;
  r = await req('DELETE', '/api/works/' + wid, undefined, btoken);
  check('cross-user delete work 404', r.status === 404, r);
  r = await req('PATCH', '/api/users/' + uid + '/profile', { nickname: 'Hacked' }, btoken);
  check('cross-user profile 403', r.status === 403, r);
  r = await reqForm('POST', '/api/users/' + uid + '/avatar', {}, {
    avatar: { data: PNG, type: 'image/png', filename: 'a.png' }
  }, btoken);
  check('cross-user avatar 403', r.status === 403, r);
  r = await req('GET', '/api/users/' + uid, undefined, utoken);
  check('nickname unchanged after attacks', r.status === 200 && r.data.data.nickname === 'CI2', r.data);

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
  }, utoken);
  check('avatar upload 200', r.status === 200, r);

  r = await reqForm('POST', '/api/works',
    { title: 'CI封面作品', publish: '1', workType: 'model' },
    { cover: { data: PNG, type: 'image/png', filename: 'cover.png' } }, utoken);
  check('work cover upload 201', r.status === 201, r);
  const wid2 = r.data.data && r.data.data.id;
  check('work cover path', !!(r.data.data && r.data.data.image.indexOf('/uploads/') >= 0), r.data);
  r = await req('DELETE', '/api/works/' + wid2, undefined, utoken);
  check('delete cover work 200', r.status === 200, r);

  const studioSnap = { color: 123, instances: [{ modelId: 'round', color: 1, offset: { x: 0.1, y: 0, z: 0 }, scale: 1, rotation: { x: 0, y: 0, z: 0 } }] };
  r = await req('POST', '/api/works', { title: 'CI-studio', publish: false, studio: studioSnap }, utoken);
  check('work studio save 201', r.status === 201 && !!(r.data.data && r.data.data.id), r);
  const swid = r.data.data && r.data.data.id;
  r = await req('GET', '/api/works/' + swid, undefined, utoken);
  check('work studio owner sees snapshot', r.status === 200 && !!(r.data.data && r.data.data.studio), r.data.data);
  r = await req('GET', '/api/works/' + swid);
  check('work studio hidden for guests', r.status === 200 && !(r.data.data && r.data.data.studio), r.data.data);

  // 回归：从“我的”页分享时不带 studio（客户端会发 studio:null），不能把已有快照清空
  r = await req('POST', '/api/works', { id: swid, title: 'CI-studio', publish: true, studio: null }, utoken);
  check('share without studio 201', r.status === 201, r);
  r = await req('GET', '/api/works/' + swid, undefined, utoken);
  check(
    'studio survives share without studio',
    r.status === 200 && !!(r.data.data && r.data.data.studio && r.data.data.studio.instances),
    r.data.data
  );

  // 回归：显式传空对象仍应被接受（用户清空案板后保存）
  r = await req('POST', '/api/works', { id: swid, title: 'CI-studio', studio: { color: 1, instances: [] } }, utoken);
  check('studio can be explicitly replaced', r.status === 201, r);
  r = await req('GET', '/api/works/' + swid, undefined, utoken);
  check(
    'replaced studio persisted',
    r.status === 200 && !!(r.data.data && r.data.data.studio && r.data.data.studio.instances &&
      r.data.data.studio.instances.length === 0),
    r.data.data
  );

  // 回归：快照超过 200KB 必须拒绝，避免把大 JSON 塞进库里
  const hugeStudio = { color: 1, instances: [], blob: 'x'.repeat(210 * 1024) };
  r = await req('POST', '/api/works', { id: swid, title: 'CI-studio', studio: hugeStudio }, utoken);
  check('oversized studio rejected 413', r.status === 413, r.status);

  await req('DELETE', '/api/works/' + swid, undefined, utoken);

  r = await req('POST', '/api/print-orders', { contact: '13800000000', note: 'smoke' }, utoken);
  check('print order 201', r.status === 201 && !!(r.data.data && r.data.data.id), r);
  r = await req('POST', '/api/print-orders', {}, utoken);
  check('print order no contact 400', r.status === 400, r);
  r = await req('GET', '/api/admin/print-orders', undefined, token);
  check('print orders admin 200', r.status === 200 && !!(r.data.data && Array.isArray(r.data.data.list)), r.data);

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
  r = await req('DELETE', '/api/admin/users/' + bid, undefined, token);
  check('cleanup CI user B 200', r.status === 200, r);
  r = await req('POST', '/api/users/login', { username, password: '123456' });
  check('deleted user login 401', r.status === 401, r);

  console.log(failures === 0 ? 'SMOKE PASS' : 'SMOKE FAIL: ' + failures);
  process.exit(failures === 0 ? 0 : 1);
})().catch(function (e) {
  console.error('SMOKE ERROR', e);
  process.exit(1);
});
