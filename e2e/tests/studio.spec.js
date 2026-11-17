// @ts-check
const { test, expect } = require('@playwright/test');

const CATEGORY_NAME = 'E2E测试分类';
const USER = process.env.E2E_USER || 'demo';
const PASS = process.env.E2E_PASS || '123456';
const API = process.env.E2E_API || 'http://127.0.0.1:3000';

/** 用真实登录表单登录（顺带覆盖登录页本身） */
async function login(page) {
  await page.goto('/login.html?return=studio');
  await page.fill('#login-form input[name="username"]', USER);
  await page.fill('#login-form input[name="password"]', PASS);
  await Promise.all([
    page.waitForURL(/profile\.html|studio\.html/, { timeout: 30_000 }),
    page.click('#login-form button[type="submit"]')
  ]);
}

/** 用当前登录态删掉测试产生的工作，本地跑不留草稿 */
async function deleteWork(page, workId) {
  if (!workId) return;
  const token = await page.evaluate(() => sessionStorage.getItem('zhijiansu_user_token') || '');
  if (!token) return;
  await page.request.delete(API + '/api/works/' + workId, {
    headers: { Authorization: 'Bearer ' + token }
  });
}

test('工作台：保存草稿 → 我的 → 编辑，模型能恢复', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '桌面端链路');
  await login(page);

  await page.goto('/studio.html');
  await expect(page.locator('#studio-canvas')).toBeVisible();

  // 模型库 → E2E 分类 → 添加模型
  await page.locator('.studio-category-card', { hasText: CATEGORY_NAME }).click();
  await expect(page.locator('#studio-library-dialog')).toHaveClass(/is-open/);
  await page.locator('#library-dialog-list .studio-model-card').first().click();
  await expect(page.locator('#loaded-model-list .studio-loaded-item')).toHaveCount(1, {
    timeout: 30_000
  });

  // 关掉模型库弹窗（桌面端加完不会自动关）
  await page.click('#library-dialog-close');
  await expect(page.locator('#studio-library-dialog')).not.toHaveClass(/is-open/);

  // 保存草稿
  await page.click('#btn-save-model');
  await expect(page.locator('#studio-save-dialog')).toHaveClass(/is-open/);
  const title = 'E2E草稿' + Date.now().toString().slice(-6);
  await page.fill('#save-draft-title', title);
  await page.click('#save-draft-confirm');
  await page.waitForURL(/profile\.html/, { timeout: 40_000 });

  // 我的 → 编辑（按标题精确点，避免点到预置的旧作品）
  const card = page.locator('.author-work-card-wrap', { hasText: title });
  await expect(card.locator('[data-edit-work]')).toBeVisible({ timeout: 20_000 });
  await card.locator('[data-edit-work]').click();
  await expect(page).toHaveURL(/studio\.html\?edit=/, { timeout: 30_000 });

  // 关键断言：模型回到案板，且状态栏明确说了恢复结果
  await expect(page.locator('#loaded-model-list .studio-loaded-item')).toHaveCount(1, {
    timeout: 40_000
  });
  await expect(page.locator('#studio-status')).toContainText('已恢复 1 个模型');

  const workId = new URL(page.url()).searchParams.get('edit');
  await deleteWork(page, workId);
});

test('移动端工作台：模型库抽屉可开、添加后自动收起', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', '仅移动端');
  await login(page);

  await page.goto('/studio.html');
  await expect(page.locator('#studio-canvas')).toBeVisible();

  const sheet = page.locator('#studio-sidebar-right');
  const fab = page.locator('#btn-open-sheet');
  await expect(fab).toBeVisible();
  await expect(sheet).not.toHaveClass(/is-open/);

  // 抽屉打开 → 遮罩出现
  await fab.click();
  await expect(sheet).toHaveClass(/is-open/);
  await expect(page.locator('#studio-sheet-backdrop')).toBeVisible();

  // 选分类 → 弹窗 → 添加模型
  await page.locator('.studio-category-card', { hasText: CATEGORY_NAME }).click();
  await expect(page.locator('#studio-library-dialog')).toHaveClass(/is-open/);
  await page.locator('#library-dialog-list .studio-model-card').first().click();

  // 加完自动收起抽屉和弹窗，能直接看到案板
  await expect(sheet).not.toHaveClass(/is-open/, { timeout: 30_000 });
  await expect(page.locator('#studio-library-dialog')).not.toHaveClass(/is-open/);
  await expect(page.locator('#loaded-model-list .studio-loaded-item')).toHaveCount(1);
});
