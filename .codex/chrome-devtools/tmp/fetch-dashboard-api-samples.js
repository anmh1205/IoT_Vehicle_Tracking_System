import {
  getBrowser,
  disconnectBrowser,
  outputJSON,
  outputError,
} from '../../skills/chrome-devtools/scripts/lib/browser.js';

const BASE_URL = process.env.AUDIT_BASE_URL || 'https://thingdock.dev';
const USERNAME = process.env.AUDIT_USERNAME || 'admin';
const PASSWORD = process.env.AUDIT_PASSWORD || 'Admin@2026';

const login = async (browser) => {
  const page = await browser.newPage();
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 45000 });
  const hasInputs = (await page.$('#username')) && (await page.$('#password'));
  if (hasInputs) {
    await page.type('#username', USERNAME, { delay: 8 });
    await page.type('#password', PASSWORD, { delay: 8 });
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }).catch(() => null),
    ]);
  }
  await page.close();
};

const run = async () => {
  try {
    const browser = await getBrowser({ headless: true });
    await login(browser);

    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 });

    const data = await page.evaluate(async () => {
      const from = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);

      const paths = [
        `/api/v1/dashboard/stats`,
        `/api/v1/dashboard/device-activity`,
        `/api/v1/dashboard/fleet-runtime`,
        `/api/v1/statistics/fleet-usage?from=${from}&to=${to}&interval=day`,
        `/api/v1/statistics/device-uptime?from=${from}&to=${to}`,
        `/api/v1/statistics/summary?from=${from}&to=${to}&interval=day`,
      ];

      const output = [];
      for (const path of paths) {
        try {
          const response = await fetch(path, { credentials: 'include' });
          const json = await response.json().catch(() => null);
          output.push({
            path,
            status: response.status,
            body: json,
          });
        } catch (error) {
          output.push({
            path,
            status: null,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      return output;
    });

    outputJSON({
      success: true,
      data,
    });

    await page.close();
    await disconnectBrowser();
  } catch (error) {
    outputError(error);
  }
};

void run();
