import fs from 'fs';
import path from 'path';
import {
  getBrowser,
  disconnectBrowser,
  outputJSON,
  outputError,
} from '../../skills/chrome-devtools/scripts/lib/browser.js';

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://thingdock.dev';
const USERNAME = process.env.AUDIT_USERNAME || 'admin';
const PASSWORD = process.env.AUDIT_PASSWORD || 'Admin@2026';
const OUTPUT_DIR = path.resolve('.codex/chrome-devtools/screenshots/full-audit');
const REPORT_PATH = path.resolve('.codex/chrome-devtools/screenshots/full-audit-report.json');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureDir = (target) => {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
};

const slug = (value) =>
  value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const login = async (browser) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 45000 });

  const usernameInput = await page.$('#username');
  const passwordInput = await page.$('#password');
  if (usernameInput && passwordInput) {
    await page.type('#username', USERNAME, { delay: 8 });
    await page.type('#password', PASSWORD, { delay: 8 });
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => null),
    ]);
  }

  await page.close();
};

const scenarioList = [
  { name: 'dashboard-overview', route: '/dashboard' },
  { name: 'dashboard-map', route: '/dashboard/map' },
  { name: 'dashboard-devices', route: '/dashboard/devices' },
  { name: 'dashboard-device-detail', route: '/dashboard/devices/1' },
  { name: 'dashboard-vehicles', route: '/dashboard/vehicles' },
  { name: 'dashboard-vehicle-detail', route: '/dashboard/vehicles/1' },
  { name: 'dashboard-drivers', route: '/dashboard/drivers' },
  { name: 'dashboard-customers', route: '/dashboard/customers' },
  { name: 'dashboard-customer-detail', route: '/dashboard/customers/1' },
  { name: 'dashboard-trips', route: '/dashboard/trips' },
  { name: 'dashboard-trip-detail', route: '/dashboard/trips/1' },
  { name: 'dashboard-alerts', route: '/dashboard/alerts' },
  { name: 'dashboard-notifications', route: '/dashboard/notifications' },
  { name: 'dashboard-violations', route: '/dashboard/violations' },
  { name: 'dashboard-geofences', route: '/dashboard/geofences' },
  { name: 'dashboard-geofence-detail', route: '/dashboard/geofences/1' },
  { name: 'dashboard-statistics', route: '/dashboard/statistics' },
  { name: 'dashboard-fuel', route: '/dashboard/fuel' },
  { name: 'dashboard-maintenance', route: '/dashboard/maintenance' },
  { name: 'dashboard-maintenance-detail', route: '/dashboard/maintenance/1' },
  { name: 'dashboard-firmware', route: '/dashboard/firmware' },
  { name: 'dashboard-exports', route: '/dashboard/exports' },
  { name: 'dashboard-simulator', route: '/dashboard/simulator' },
  { name: 'dashboard-system-status', route: '/dashboard/system-status' },
  { name: 'dashboard-system-admin', route: '/dashboard/system-admin' },
  { name: 'dashboard-users', route: '/dashboard/users' },
  { name: 'dashboard-settings', route: '/dashboard/settings' },
  { name: 'dashboard-admin-users', route: '/dashboard/admin/users' },
  { name: 'dashboard-admin-system', route: '/dashboard/admin/system' },
  { name: 'dashboard-admin-system-status', route: '/dashboard/admin/system-status' },
];

const runScenario = async (browser, scenario) => {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  const onConsole = (message) => {
    const type = message.type();
    if (type === 'error' || type === 'warning') {
      consoleErrors.push({ type, text: message.text() });
    }
  };
  const onPageError = (error) => pageErrors.push(error.message);
  const onRequestFailed = (request) =>
    failedRequests.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText ?? 'unknown',
    });

  page.on('console', onConsole);
  page.on('pageerror', onPageError);
  page.on('requestfailed', onRequestFailed);

  try {
    await page.goto(`${BASE_URL}${scenario.route}`, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    await delay(1200);

    const screenshotPath = path.join(OUTPUT_DIR, `${slug(scenario.name)}.png`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png',
    });

    return {
      name: scenario.name,
      route: scenario.route,
      finalUrl: page.url(),
      title: await page.title(),
      screenshotPath,
      consoleErrors,
      pageErrors,
      failedRequests,
    };
  } finally {
    await page.close();
  }
};

const run = async () => {
  ensureDir(OUTPUT_DIR);

  try {
    const browser = await getBrowser({ headless: true });
    await login(browser);

    const results = [];
    for (const scenario of scenarioList) {
      results.push(await runScenario(browser, scenario));
    }

    fs.writeFileSync(REPORT_PATH, JSON.stringify(results, null, 2), 'utf8');
    outputJSON({
      success: true,
      baseUrl: BASE_URL,
      reportPath: REPORT_PATH,
      totalScenarios: results.length,
      screenshots: results.map((item) => item.screenshotPath),
    });
    await disconnectBrowser();
  } catch (error) {
    outputError(error);
  }
};

void run();
