import fs from 'fs';
import path from 'path';
import { getBrowser, getPage, disconnectBrowser, outputJSON, outputError } from '../../skills/chrome-devtools/scripts/lib/browser.js';

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://thingdock.dev';
const USERNAME = process.env.AUDIT_USERNAME || 'admin';
const PASSWORD = process.env.AUDIT_PASSWORD || 'Admin@2026';
const SCREENSHOT_DIR = path.resolve('.codex/chrome-devtools/screenshots');

const ROUTES = [
  '/dashboard',
  '/dashboard/map',
  '/dashboard/devices',
  '/dashboard/devices/1',
  '/dashboard/vehicles',
  '/dashboard/drivers',
  '/dashboard/trips',
  '/dashboard/violations',
  '/dashboard/geofences',
  '/dashboard/alerts',
  '/dashboard/statistics',
  '/dashboard/maintenance',
  '/dashboard/customers',
  '/dashboard/system-status',
  '/dashboard/system-admin',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const slugify = (route) =>
  route
    .replace(/^\//, '')
    .replace(/\/+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .toLowerCase();

const ensureDir = (target) => {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
};

const loginIfNeeded = async (page) => {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 45000 });

  const usernameInput = await page.$('#username');
  const passwordInput = await page.$('#password');
  if (!usernameInput || !passwordInput) {
    return;
  }

  await page.type('#username', USERNAME, { delay: 10 });
  await page.type('#password', PASSWORD, { delay: 10 });

  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => null),
  ]);
};

const captureRoute = async (page, route) => {
  const url = `${BASE_URL}${route}`;
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  const onConsole = (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      consoleErrors.push({
        type,
        text: message.text(),
      });
    }
  };
  const onPageError = (error) => pageErrors.push(error.message);
  const onRequestFailed = (request) =>
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText ?? 'unknown',
    });

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await sleep(1200);

    const screenshotPath = path.join(SCREENSHOT_DIR, `audit-${slugify(route)}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png',
    });

    return {
      route,
      url: page.url(),
      title: await page.title(),
      screenshotPath,
      consoleErrors,
      pageErrors,
      failedRequests,
    };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onPageError);
    page.off('requestfailed', onRequestFailed);
  }
};

const run = async () => {
  ensureDir(SCREENSHOT_DIR);

  try {
    const browser = await getBrowser({ headless: true });
    const page = await getPage(browser);
    await page.setViewport({ width: 1440, height: 900 });

    await loginIfNeeded(page);

    const results = [];
    for (const route of ROUTES) {
      results.push(await captureRoute(page, route));
    }

    const reportPath = path.resolve('.codex/chrome-devtools/screenshots/audit-dashboard-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');

    outputJSON({
      success: true,
      reportPath,
      routeCount: results.length,
      screenshots: results.map((result) => result.screenshotPath),
    });
    await disconnectBrowser();
  } catch (error) {
    outputError(error);
  }
};

void run();
