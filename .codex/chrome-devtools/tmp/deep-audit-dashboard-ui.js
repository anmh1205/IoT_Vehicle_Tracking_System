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
const OUTPUT_DIR = path.resolve('.codex/chrome-devtools/screenshots/deep-audit');
const REPORT_PATH = path.resolve('.codex/chrome-devtools/screenshots/deep-audit-report.json');

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

const scenarioList = [
  {
    name: 'real-dashboard',
    route: '/dashboard',
  },
  {
    name: 'real-map',
    route: '/dashboard/map',
  },
  {
    name: 'real-drivers',
    route: '/dashboard/drivers',
  },
  {
    name: 'mock-dashboard-rich',
    route: '/dashboard',
    mocks: [
      {
        match: (url) => url.includes('/api/v1/dashboard/stats'),
        body: {
          data: {
            totalDevices: 18,
            activeDevices: 14,
            offlineDevices: 4,
            alertsCount: 6,
            totalRuntimeToday: 148,
            totalRuntimeWeek: 932,
            sessionsToday: 42,
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/dashboard/activity'),
        body: {
          data: {
            items: [
              {
                id: 1,
                eventType: 'speeding',
                severity: 'high',
                message: 'Xe 51A-999.99 vuot toc do tai QL1A',
                serverTimestamp: new Date().toISOString(),
              },
              {
                id: 2,
                eventType: 'device_offline',
                severity: 'medium',
                message: 'TRACKER_004 mat ket noi 5 phut',
                serverTimestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
              },
            ],
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/dashboard/device-activity'),
        body: {
          data: {
            items: [
              { label: 'T2', running: 7, idle: 2, offline: 1 },
              { label: 'T3', running: 8, idle: 1, offline: 2 },
              { label: 'T4', running: 6, idle: 3, offline: 1 },
              { label: 'T5', running: 9, idle: 1, offline: 0 },
              { label: 'T6', running: 7, idle: 2, offline: 1 },
              { label: 'T7', running: 5, idle: 4, offline: 2 },
              { label: 'CN', running: 4, idle: 4, offline: 3 },
            ],
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/dashboard/device-status'),
        body: {
          data: {
            items: [
              { name: 'Dang chay', value: 14, color: '#22c55e' },
              { name: 'Da dung', value: 2, color: '#64748b' },
              { name: 'Ngoai tuyen', value: 2, color: '#ef4444' },
            ],
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/dashboard/fleet-runtime'),
        body: {
          data: {
            items: Array.from({ length: 10 }).map((_, index) => ({
              label: `03/${10 + index}`,
              runtime: 18 + index * 2,
            })),
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/notifications'),
        body: { data: { items: [], pagination: { page: 1, limit: 8, total: 0, totalPages: 0 } } },
      },
    ],
  },
  {
    name: 'mock-map-rich',
    route: '/dashboard/map',
    mocks: [
      {
        match: (url) => url.includes('/api/v1/devices/positions'),
        body: {
          data: {
            items: [
              {
                deviceId: 'TRACKER_001',
                deviceName: 'Tracker 001',
                vehiclePlate: '51A-999.99',
                lat: 10.77689,
                lon: 106.7009,
                speed: 52,
                heading: 120,
                status: 'running',
                timestamp: new Date().toISOString(),
                battery: 87,
                vibration: 0.42,
                temperature: 34,
              },
              {
                deviceId: 'TRACKER_002',
                deviceName: 'Tracker 002',
                vehiclePlate: '51H-123.45',
                lat: 10.80333,
                lon: 106.70889,
                speed: 0,
                heading: 35,
                status: 'stopped',
                timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
                battery: 65,
                vibration: 0.08,
                temperature: 33,
              },
            ],
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/geofences'),
        body: { data: { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } },
      },
    ],
    actions: async (page) => {
      await page.waitForSelector('aside', { timeout: 15000 }).catch(() => null);

      const selectors = [
        'aside .space-y-2 > div',
        'aside [class*="cursor-pointer"]',
        'aside [role="button"]',
        'aside button',
      ];

      for (const selector of selectors) {
        const node = await page.$(selector);
        if (node) {
          await page.click(selector).catch(() => null);
          break;
        }
      }
      await delay(800);
    },
  },
  {
    name: 'mock-drivers-list-and-modal',
    route: '/dashboard/drivers',
    mocks: [
      {
        match: (url) => url.includes('/api/v1/drivers?') || url.endsWith('/api/v1/drivers'),
        body: {
          data: {
            items: [
              {
                id: 1,
                driverCode: 'DRV-001',
                fullName: 'Nguyen Van A',
                phone: '0901234567',
                email: 'a@example.com',
                licenseNumber: '79A123456',
                licenseType: 'B2',
                licenseExpiry: '2027-08-20T00:00:00.000Z',
                dateOfBirth: '1994-03-10T00:00:00.000Z',
                address: 'Thu Duc, HCM',
                status: 'active',
                notes: 'Tuyen xe bac nam',
                createdAt: '2026-01-15T04:00:00.000Z',
                updatedAt: new Date().toISOString(),
              },
              {
                id: 2,
                driverCode: 'DRV-002',
                fullName: 'Tran Thi B',
                phone: '0912345678',
                email: 'b@example.com',
                licenseNumber: '51B123456',
                licenseType: 'C',
                licenseExpiry: '2026-09-01T00:00:00.000Z',
                dateOfBirth: '1991-11-22T00:00:00.000Z',
                address: 'Bien Hoa, Dong Nai',
                status: 'inactive',
                notes: '',
                createdAt: '2026-02-01T04:00:00.000Z',
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/drivers/1'),
        body: {
          data: {
            id: 1,
            driverCode: 'DRV-001',
            fullName: 'Nguyen Van A',
            phone: '0901234567',
            email: 'a@example.com',
            licenseNumber: '79A123456',
            licenseType: 'B2',
            licenseExpiry: '2027-08-20T00:00:00.000Z',
            dateOfBirth: '1994-03-10T00:00:00.000Z',
            address: 'Thu Duc, HCM',
            status: 'active',
            notes: 'Tuyen xe bac nam',
            createdAt: '2026-01-15T04:00:00.000Z',
            updatedAt: new Date().toISOString(),
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/trips'),
        body: {
          data: {
            items: [
              {
                id: 11,
                tripCode: 'TRIP-001',
                vehicleId: 'VEH-001',
                driverName: 'Nguyen Van A',
                status: 'in_progress',
                actualStart: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
              },
            ],
            pagination: { page: 1, limit: 6, total: 1, totalPages: 1 },
          },
        },
      },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      const row = await page.$('table tbody tr');
      if (row) {
        await row.click().catch(() => null);
      }
      await page.waitForSelector('[role=\"dialog\"]', { timeout: 10000 }).catch(() => null);
      await delay(600);
    },
  },
  {
    name: 'mock-vehicles-list-and-modal',
    route: '/dashboard/vehicles',
    mocks: [
      {
        match: (url) => url.includes('/api/v1/vehicles?') || url.endsWith('/api/v1/vehicles'),
        body: {
          data: {
            items: [
              {
                id: 1,
                vehicleId: 'VEH-001',
                plateNumber: '51A-999.99',
                brand: 'Toyota',
                model: 'Fortuner',
                year: 2022,
                status: 'active',
                deviceId: 'TRACKER_001',
                customerId: 12,
                vehicleType: 'SUV',
                seats: 7,
                mileageKm: 18234,
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/devices?') || url.endsWith('/api/v1/devices'),
        body: {
          data: {
            items: [
              { id: 101, deviceId: 'TRACKER_001', deviceName: 'Tracker 001', currentStatus: 'running' },
              { id: 102, deviceId: 'TRACKER_002', deviceName: 'Tracker 002', currentStatus: 'stopped' },
            ],
            pagination: { page: 1, limit: 100, total: 2, totalPages: 1 },
          },
        },
      },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      const row = await page.$('table tbody tr');
      if (row) {
        await row.click().catch(() => null);
      }
      await page.waitForSelector('[data-slot=\"sheet-content\"]', { timeout: 10000 }).catch(() => null);
      await delay(600);
    },
  },
  {
    name: 'mock-violations-list-and-modal',
    route: '/dashboard/violations',
    mocks: [
      {
        match: (url) => url.includes('/api/v1/violations?') || url.endsWith('/api/v1/violations'),
        body: {
          data: {
            items: [
              {
                id: 1,
                alertId: 22,
                vehicleId: '51A-999.99',
                driverId: 1,
                violationType: 'speeding',
                severity: 'high',
                description: 'Vuot toc do > 20 km/h',
                acknowledged: false,
                createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
          },
        },
      },
      {
        match: (url) => url.includes('/api/v1/violations/1'),
        body: {
          data: {
            id: 1,
            alertId: 22,
            vehicleId: '51A-999.99',
            driverId: 1,
            violationType: 'speeding',
            severity: 'high',
            description: 'Vuot toc do > 20 km/h',
            policyType: 'speed_limit',
            speedLimit: 60,
            actualSpeed: 89,
            locationLat: 10.77689,
            locationLon: 106.7009,
            fineAmount: 1500000,
            acknowledged: false,
            acknowledgedBy: null,
            acknowledgedAt: null,
            notes: 'Can nhac lai tai xe va giam sat them 1 tuan',
            createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      },
    ],
    actions: async (page) => {
      await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => null);
      const row = await page.$('table tbody tr');
      if (row) {
        await row.click().catch(() => null);
      }
      await page.waitForSelector('[role=\"dialog\"]', { timeout: 10000 }).catch(() => null);
      await delay(600);
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
