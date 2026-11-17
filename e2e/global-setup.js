/**
 * E2E 准备：用管理端接口建一个分类并上传一个真实 GLB，
 * 让「模型库 → 添加模型」这条链路有真实数据可点。
 * 结束时由 global-teardown 删掉，本地跑不会留垃圾数据。
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const API = process.env.E2E_API || 'http://127.0.0.1:3000';
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'zhijiansu@admin';
const CATEGORY_NAME = 'E2E测试分类';
const MODEL_NAME = 'E2E测试模型';
const STATE_FILE = path.join(os.tmpdir(), 'zhijiansu-e2e-state.json');

async function jsonFetch(url, options) {
  const res = await fetch(url, options);
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* 忽略 */
  }
  return { status: res.status, data };
}

module.exports = async function globalSetup() {
  const login = await jsonFetch(API + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS })
  });
  if (login.status !== 200 || !login.data.token) {
    throw new Error('E2E: 管理员登录失败 ' + login.status + ' ' + JSON.stringify(login.data));
  }
  const token = login.data.token;
  const auth = { Authorization: 'Bearer ' + token };

  // 分类：已存在就复用（本地重复跑时不报错）
  let categoryId = '';
  const cats = await jsonFetch(API + '/api/admin/studio-model-categories', { headers: auth });
  const exist = (cats.data && cats.data.data && cats.data.data.list ? cats.data.data.list : []).find(
    (c) => c.name === CATEGORY_NAME
  );
  if (exist) {
    categoryId = exist.id;
  } else {
    const created = await jsonFetch(API + '/api/admin/studio-model-categories', {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: CATEGORY_NAME, sortOrder: 999 })
    });
    categoryId = created.data && created.data.data && created.data.data.id;
    if (!categoryId) throw new Error('E2E: 创建分类失败 ' + JSON.stringify(created.data));
  }

  // 模型：上传仓库里自带的真实 GLB
  const glbPath = path.join(__dirname, '..', 'frontend', 'models', 'tools', 'tool-muzi.glb');
  const fd = new FormData();
  fd.append('name', MODEL_NAME);
  fd.append('categoryId', categoryId);
  fd.append('sortOrder', '1');
  fd.append(
    'glb',
    new Blob([fs.readFileSync(glbPath)], { type: 'application/octet-stream' }),
    'e2e-model.glb'
  );
  const uploaded = await jsonFetch(API + '/api/admin/studio-models', {
    method: 'POST',
    headers: auth,
    body: fd
  });
  const modelId = uploaded.data && uploaded.data.data && uploaded.data.data.id;
  if (!modelId) throw new Error('E2E: 上传模型失败 ' + JSON.stringify(uploaded.data));

  fs.writeFileSync(STATE_FILE, JSON.stringify({ token, categoryId, modelId, categoryName: CATEGORY_NAME }), 'utf8');
  console.log('[e2e] 准备完成：分类 ' + categoryId + '，模型 ' + modelId);
};
