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
    await page.setViewport({ width: 1440, height: 900 });

    const responses = [];
    page.on('response', (response) => {
      const url = response.url();
      if (!url.includes('/api/')) {
        return;
      }
      const status = response.status();
      if (status >= 400) {
        responses.push({
          status,
          method: response.request().method(),
          url,
        });
      }
    });

    const requestFailures = [];
    page.on('requestfailed', (request) => {
      requestFailures.push({
        method: request.method(),
        url: request.url(),
        failure: request.failure()?.errorText ?? 'unknown',
      });
    });

    await page.goto(`${BASE_URL}/dashboard/map`, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 5000));

    outputJSON({
      success: true,
      responses,
      requestFailures,
    });

    await page.close();
    await disconnectBrowser();
  } catch (error) {
    outputError(error);
  }
};

void run();
