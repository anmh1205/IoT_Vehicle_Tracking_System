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
const OUTPUT_DIR = path.resolve('.codex/chrome-devtools/screenshots/interaction-audit-round4');
const REPORT_PATH = path.resolve('.codex/chrome-devtools/screenshots/interaction-audit-round4-report.json');

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

const jsonOk = (body) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

const createMockRouter = (mocks) => (request) => {
  const url = request.url();
  const method = request.method().toUpperCase();
  const matched = mocks.find((mock) => mock.match(url, method));
  if (!matched) {
    return request.continue();
  }
  return request.respond(jsonOk(matched.body));
};

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

const scenarios = [
  {
    name: 'real-map-with-selection',
    route: '/dashboard/map',
    actions: async (page) => {
      await page.waitForSelector('aside', { timeout: 15000 }).catch(() => null);
      const candidates = ['aside .space-y-2 > div', 'aside [class*="cursor-pointer"]', 'aside button'];
      for (const selector of candidates) {
        const node = await page.$(selector);
        if (node) {
          await node.click().catch(() => null);
          break;
        }
      }
      await delay(800);
    },
  },
  {
    name: 'mock-device-detail-modal-rich',
    route: '/dashboard/devices',
    mocks: [
      {
        match: (url) => url.includes('/api/v1/devices?'),
        body: {
          data: {
            items: [
              {
                id: 101,
                deviceId: 'TRACKER_001',
                deviceName: 'Tracker 001',
                currentStatus: 'running',
                imei: '866931072334001',
                firmwareVersion: '1.4.8',
                vehiclePlate: '51A-999.99',
                customerName: 'Fleet Minh An',
                lastSeenAt: new Date().toISOString(),
                latitude: 10.77689,
                longitude: 106.7009,
                totalRuntimeSeconds: 68220,
                requestInterval: 30,
                vibrationThreshold: 1.4,
                lastErrorCode: 212,
              },
            ],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/devices/101') && !url.includes('/runtime') && !url.includes('/sessions') && !url.includes('/commands') && !url.includes('/errors') && !url.includes('/telemetry'),
        body: {
          data: {
            id: 101,
            deviceId: 'TRACKER_001',
            deviceName: 'Tracker 001',
            currentStatus: 'running',
            imei: '866931072334001',
            firmwareVersion: '1.4.8',
            vehiclePlate: '51A-999.99',
            customerName: 'Fleet Minh An',
            lastSeenAt: new Date().toISOString(),
            latitude: 10.77689,
            longitude: 106.7009,
            totalRuntimeSeconds: 68220,
            requestInterval: 30,
            vibrationThreshold: 1.4,
            lastErrorCode: 212,
            currentSession: {
              id: 887,
              status: 'running',
              serverSessionStart: new Date(Date.now() - 82 * 60 * 1000).toISOString(),
            },
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/devices/101/runtime'),
        body: {
          data: {
            totalRuntime: 68220,
            totalSessions: 24,
            avgSessionDuration: 2842,
            avgVibration: 1.92,
            totalDataPoints: 12812,
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/devices/101/sessions'),
        body: {
          data: {
            items: [
              {
                id: 887,
                status: 'running',
                serverSessionStart: new Date(Date.now() - 82 * 60 * 1000).toISOString(),
                serverSessionEnd: null,
                uptime: 4920,
                avgVibration: 2.12,
                dataPointsCount: 542,
              },
              {
                id: 886,
                status: 'completed',
                serverSessionStart: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
                serverSessionEnd: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
                uptime: 7200,
                avgVibration: 1.54,
                dataPointsCount: 901,
              },
            ],
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/devices/101/commands'),
        body: { data: { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } },
      },
      {
        match: (url) => url.includes('/api/v1/devices/101/errors'),
        body: {
          data: {
            items: [
              {
                id: 501,
                errorCode: 212,
                errorName: 'GPS weak signal',
                description: 'Signal quality reduced in urban canyon',
                occurredAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
                resolvedAt: null,
              },
            ],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/devices/101/telemetry') && url.includes('metric=vib'),
        body: {
          data: {
            items: Array.from({ length: 24 }).map((_, index) => ({
              timestamp: new Date(Date.now() - (24 - index) * 5 * 60 * 1000).toISOString(),
              value: Number((1.2 + Math.sin(index / 2) * 0.6 + Math.random() * 0.2).toFixed(2)),
            })),
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/notifications'),
        body: { data: { items: [], pagination: { page: 1, limit: 8, total: 0, totalPages: 0 } } },
      },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      const row = await page.$('table tbody tr');
      if (row) {
        await row.click().catch(() => null);
      }
      await page.waitForSelector('[role="dialog"]', { timeout: 10000 }).catch(() => null);
      await delay(1000);
    },
  },
  {
    name: 'mock-trip-detail-rich',
    route: '/dashboard/trips/88',
    mocks: [
      {
        match: (url) => url.includes('/api/v1/trips/88') && !url.includes('/telemetry'),
        body: {
          data: {
            id: 88,
            tripCode: 'TRIP-UAT-088',
            vehicleId: 'VEH-001',
            deviceId: 'TRACKER_001',
            driverName: 'Nguyen Van A',
            status: 'in_progress',
            plannedStart: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
            actualStart: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
            distanceKm: 42,
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/trips/88/telemetry'),
        body: {
          data: {
            points: Array.from({ length: 30 }).map((_, index) => ({
              lat: 10.74 + index * 0.0013,
              lon: 106.64 + index * 0.0014,
              speed: Math.max(0, Math.round(24 + Math.sin(index / 3) * 22)),
              timestamp: new Date(Date.now() - (30 - index) * 4 * 60 * 1000).toISOString(),
            })),
            summary: {
              distanceKm: 42,
              durationMinutes: 155,
              avgSpeed: 34,
              maxSpeed: 78,
            },
          },
        },
      },
    ],
    actions: async () => {
      await delay(1200);
    },
  },
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

  if (Array.isArray(scenario.mocks) && scenario.mocks.length > 0) {
    await page.setRequestInterception(true);
    const mockRouter = createMockRouter(scenario.mocks);
    page.on('request', mockRouter);
  }

  try {
    await page.goto(`${BASE_URL}${scenario.route}`, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });
    await delay(1200);

    let actionError = null;
    if (typeof scenario.actions === 'function') {
      try {
        await scenario.actions(page);
      } catch (error) {
        actionError = error instanceof Error ? error.message : String(error);
      }
    }

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
      actionError,
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
    for (const scenario of scenarios) {
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
