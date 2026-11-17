/**
 * E2E 收尾：删掉 global-setup 建的分类和模型，避免本地跑完留下测试数据。
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const API = process.env.E2E_API || 'http://127.0.0.1:3000';
const STATE_FILE = path.join(os.tmpdir(), 'zhijiansu-e2e-state.json');

module.exports = async function globalTeardown() {
  if (!fs.existsSync(STATE_FILE)) return;
  let state = null;
  try {
    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (e) {
    return;
  }
  const auth = { Authorization: 'Bearer ' + state.token };
  const del = async (url) => {
    try {
      await fetch(API + url, { method: 'DELETE', headers: auth });
    } catch (e) {
      /* 清理失败不影响结果 */
    }
  };
  if (state.modelId) await del('/api/admin/studio-models/' + state.modelId);
  if (state.categoryId) await del('/api/admin/studio-model-categories/' + state.categoryId);
  try {
    fs.unlinkSync(STATE_FILE);
  } catch (e) {}
  console.log('[e2e] 测试数据已清理');
};
