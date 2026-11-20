// @ts-check
const path = require('path');
const { test, expect } = require('@playwright/test');

const API = process.env.E2E_API || 'http://127.0.0.1:3000';
const ADMIN_USER = process.env.E2E_ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS || 'zhijiansu@admin';
const USER = process.env.E2E_USER || 'demo';
const PASS = process.env.E2E_PASS || '123456';
const HUMAN_NAME = 'E2E数字人' + Date.now().toString().slice(-6);
const GLB_PATH = path.join(__dirname, '..', '..', 'assets', 'digital-human-samples', 'shaded.glb');

test('后台数字人上传/预览/启用 → Studio 加载 → 删除回退', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '桌面链路');

  let adminToken = '';
  let humanId = '';

  try {
    // 1. 管理员登录
    await page.goto(API + '/admin/');
    await page.fill('#login-form input[name="username"]', ADMIN_USER);
    await page.fill('#login-form input[name="password"]', ADMIN_PASS);
    await page.click('#btn-login-submit');
    await expect(page.locator('#app')).toBeVisible({ timeout: 20_000 });
    adminToken = await page.evaluate(() => localStorage.getItem('zhijiansu_admin_token') || '');
    expect(adminToken).toBeTruthy();

    // 2. 数字人管理 → 新增
    await page.click('[data-panel="humans"]');
    await expect(page.locator('#panel-humans')).toHaveClass(/is-active/);
    await page.click('#btn-human-new');
    await expect(page.locator('#human-form')).toBeVisible();
    await page.fill('#human-name', HUMAN_NAME);
    await page.check('#human-enabled');
    await page.setInputFiles('#human-glb', GLB_PATH);

    // 缩略图由 Three.js 自动生成
    await expect(page.locator('#human-thumb-status')).toContainText('缩略图已自动生成', {
      timeout: 60_000
    });
    await page.click('#human-form button[type="submit"]');

    const row = page.locator('#humans-list tr', { hasText: HUMAN_NAME });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText('已启用');
    humanId = (await row.locator('[data-preview-human]').getAttribute('data-preview-human')) || '';
    expect(humanId).toBeTruthy();

    // 3. 后台预览：模型 + 背景
    await row.locator('[data-preview-human]').click();
    await expect(page.locator('#human-preview-modal')).toBeVisible();
    await expect(page.locator('#human-preview-stage canvas')).toBeVisible({ timeout: 30_000 });
    await page.click('#human-preview-close');
    await expect(page.locator('#human-preview-modal')).toBeHidden();

    // 4. 前台登录 → Studio 加载当前启用数字人
    await page.goto('/login.html?return=studio');
    await page.fill('#login-form input[name="username"]', USER);
    await page.fill('#login-form input[name="password"]', PASS);
    await page.click('#login-form button[type="submit"]');
    await page.waitForURL(/studio\.html/, { timeout: 30_000 });

    await expect(page.locator('#studio-human')).toHaveClass(/is-3d/, { timeout: 45_000 });
    const background = await page.evaluate(() => {
      const el = document.getElementById('studio-human');
      return el ? getComputedStyle(el).backgroundColor : '';
    });
    expect(background).toBe('rgb(243, 235, 224)');

    // 5. 删除启用项 -> 前台空状态，且不再请求默认模型/默认海报
    const defaultAssetRequests = [];
    page.on('request', function (req) {
      const url = req.url();
      if (url.indexOf('models/avatar/shaded.glb') >= 0 || url.indexOf('studio-digital-human.jpg') >= 0) {
        defaultAssetRequests.push(url);
      }
    });
    await request.delete(API + '/api/admin/digital-humans/' + humanId, {
      headers: { Authorization: 'Bearer ' + adminToken }
    });
    humanId = '';
    await page.reload();
    await expect(page.locator('#studio-human')).toHaveClass(/is-empty/, { timeout: 20_000 });
    await expect(page.locator('#studio-human-empty')).toBeVisible();
    await expect(page.locator('#human-actions-idle')).toBeHidden();
    expect(defaultAssetRequests).toEqual([]);
  } finally {
    // 6. 清理测试数字人（即使断言失败也尽量删除）
    if (humanId && adminToken) {
      await request.delete(API + '/api/admin/digital-humans/' + humanId, {
        headers: { Authorization: 'Bearer ' + adminToken }
      });
    }
  }
});
