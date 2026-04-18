import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Admin/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');

const outDir = path.resolve('E:/anmh1205/IoT_Vehicle_Tracking_System/resources/reports/audit-v1/2026-04-19/live');
await fs.mkdir(outDir, { recursive: true });

const baseUrl = 'http://localhost:4001';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });

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

async function snap(name, route, waitMs = 1200) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

async function snapCurrent(name) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

await login();
await snap('map', '/dashboard/operations/map', 2500);

const firstMapCard = page.locator('aside button').nth(0);
if (await firstMapCard.count()) {
  await firstMapCard.click();
  await page.waitForTimeout(1600);
  await snapCurrent('map-selected');
}

await snap('geofences', '/dashboard/operations/geofences', 1500);
const geofenceCreateButton = page.getByRole('button', { name: /Thêm vùng giám sát/i }).first();
if (await geofenceCreateButton.count()) {
  await geofenceCreateButton.click();
  await page.waitForTimeout(1200);
  await snapCurrent('geofences-create');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
}

await snap('trips', '/dashboard/operations/trips', 1500);
const firstTripDetail = page.getByRole('button', { name: /Xem nhanh|Chi tiết|Preview/i }).first();
if (await firstTripDetail.count()) {
  await firstTripDetail.click();
  await page.waitForTimeout(1800);
  await snapCurrent('trips-preview');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
}

await snap('vehicles', '/dashboard/fleet/vehicles', 1500);
const vehicleDetailButton = page.getByRole('button', { name: /Chi tiết/i }).first();
if (await vehicleDetailButton.count()) {
  await vehicleDetailButton.click();
  await page.waitForTimeout(1500);
  await snapCurrent('vehicles-detail');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
}

await snap('drivers', '/dashboard/fleet/drivers', 1500);
const driverDetailButton = page.getByRole('button', { name: /Chi tiết/i }).first();
if (await driverDetailButton.count()) {
  await driverDetailButton.click();
  await page.waitForTimeout(1500);
  await snapCurrent('drivers-detail');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
}

await snap('customers', '/dashboard/fleet/customers', 1500);
const customerLinks = page.locator('a[href*="/dashboard/fleet/customers/"]');
if (await customerLinks.count()) {
  await customerLinks.first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
  await snapCurrent('customers-detail');
}

await snap('maintenance', '/dashboard/attention/maintenance', 1500);
const queueButton = page.getByRole('button', { name: /Mở danh sách cảnh báo/i }).first();
if (await queueButton.count()) {
  await queueButton.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1400);
  await snapCurrent('alerts-queue');
  const detailButtons = page.getByRole('button', { name: /Chi tiết/i });
  if (await detailButtons.count()) {
    await detailButtons.first().click();
    await page.waitForTimeout(1800);
    await snapCurrent('alerts-detail');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(800);
  }
}

await snap('firmware', '/dashboard/platform/firmware', 1800);
const deployButton = page.getByRole('button', { name: /Triển khai/i }).first();
if (await deployButton.count()) {
  await deployButton.click();
  await page.waitForTimeout(1500);
  await snapCurrent('firmware-deploy');
}

await browser.close();
console.log(outDir);
