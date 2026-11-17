// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * 前端 E2E：只做行为断言（页面可用、无横向溢出、关键链路走得通），不做截图比对。
 * 默认连本机已起的前后端：前端 8765（node frontend/scripts/serve.js）、后端 3000。
 * 覆盖地址：E2E_BASE / E2E_API
 */
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8765';

module.exports = defineConfig({
  testDir: './tests',
  globalSetup: require.resolve('./global-setup'),
  globalTeardown: require.resolve('./global-teardown'),
  // 共用一个后端数据库，串行更稳
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // 只用行式报告：不生成 playwright-report 目录
  reporter: [['line']],
  outputDir: './test-results',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE,
    // 仅失败时留一张截图，方便看 CI 挂了长什么样
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 }
      }
    }
  ]
});
