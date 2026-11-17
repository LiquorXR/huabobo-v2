// @ts-check
const { test, expect } = require('@playwright/test');

/** 主要页面：能打开、无未捕获 JS 异常、无横向溢出 */
const PAGES = [
  '/index.html',
  '/gallery.html',
  '/huayang.html',
  '/digital.html',
  '/artisans.html',
  '/login.html'
];

for (const pagePath of PAGES) {
  test('页面可用：' + pagePath, async ({ page }) => {
    /** @type {string[]} */
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));

    const res = await page.goto(pagePath, { waitUntil: 'domcontentloaded' });
    expect(res && res.status()).toBe(200);
    await page.waitForTimeout(800); // 等 i18n 与首屏数据渲染

    expect(errors, '未捕获的 JS 异常：' + errors.join(' | ')).toEqual([]);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow, '横向溢出 ' + overflow + 'px').toBeLessThanOrEqual(1);
  });
}

test('桌面导航常显、汉堡隐藏', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', '仅桌面端');
  await page.goto('/index.html');
  await expect(page.locator('.main-nav')).toBeVisible();
  await expect(page.locator('.nav-toggle')).toBeHidden();
});

test('移动端汉堡菜单可展开并跳转', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', '仅移动端');
  await page.goto('/index.html');

  const toggle = page.locator('.nav-toggle');
  await expect(toggle).toBeVisible();
  await expect(page.locator('.main-nav')).toBeHidden();

  await toggle.click();
  await expect(page.locator('.main-nav')).toHaveClass(/is-open/);
  await expect(page.locator('.main-nav a', { hasText: '数字化展厅' })).toBeVisible();

  await page.locator('.main-nav a', { hasText: '数字化展厅' }).click();
  await expect(page).toHaveURL(/gallery\.html/);
});
