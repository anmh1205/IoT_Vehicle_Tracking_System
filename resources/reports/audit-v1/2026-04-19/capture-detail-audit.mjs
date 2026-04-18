import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');

const outDir = path.resolve('E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/audit-v1/2026-04-19/live');
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const baseUrl = 'http://localhost:4001';

async function login() {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await page.fill('#username', 'admin');
  await page.fill('#password', 'Admin@2026');
  await Promise.all([
    page.waitForURL(/\/dashboard/, { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForLoadState('networkidle');
}

async function shot(name) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

await login();

await page.goto(`${baseUrl}/dashboard/operations/map`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const trackerCard = page.getByText(/Tracker Sedan 001/i).first();
if (await trackerCard.count()) {
  await trackerCard.click();
  await page.waitForTimeout(1800);
  await shot('map-selected-fixed');
}

await page.goto(`${baseUrl}/dashboard/fleet/devices`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1800);
const detailButton = page.getByRole('button', { name: /Chi tiết/i }).first();
if (await detailButton.count()) {
  await detailButton.click();
  await shot('devices-detail-overview');

  for (const [tabName, shotName] of [
    ['Lộ trình', 'devices-detail-route'],
    ['Mã lỗi', 'devices-detail-errors'],
    ['Dữ liệu thô', 'devices-detail-raw'],
    ['Cài đặt', 'devices-detail-settings'],
  ]) {
    const tab = page.getByRole('tab', { name: new RegExp(tabName, 'i') }).first();
    if (await tab.count()) {
      await tab.click();
      await shot(shotName);
    }
  }
}

await browser.close();
