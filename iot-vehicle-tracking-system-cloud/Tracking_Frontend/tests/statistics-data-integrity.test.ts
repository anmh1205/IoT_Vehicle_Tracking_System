import test from 'node:test';
import assert from 'node:assert/strict';
import { AxiosError, type AxiosAdapter } from 'axios';
import { apiClient } from '../src/lib/api/client';
import { statisticsServices } from '../src/lib/api/statistics';

const withAdapter = async <T>(adapter: AxiosAdapter, action: () => Promise<T>): Promise<T> => {
  const previous = apiClient.defaults.adapter;
  apiClient.defaults.adapter = adapter;
  try {
    return await action();
  } finally {
    apiClient.defaults.adapter = previous;
  }
};

test('real zero vehicle usage is preserved as a valid API response', async () => {
  const data = {
    labels: ['2026-10-15T00:00:00.000Z'],
    activeVehicles: [0],
    inactiveVehicles: [0],
  };
  const actual = await withAdapter(
    async (config) => ({
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { requestId: 'stats-zero', data },
    }),
    () => statisticsServices.getFleetUsage({ from: '2026-10-15', to: '2026-10-15' }),
  );

  assert.deepEqual(actual, data);
});

test('real zero uptime is preserved instead of fabricated activity', async () => {
  const data = {
    devices: [{ deviceId: 'DEVICE-1', uptimePercent: 0, totalHours: 24, downHours: 24 }],
  };
  const actual = await withAdapter(
    async (config) => ({
      config,
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { requestId: 'uptime-zero', data },
    }),
    () => statisticsServices.getDeviceUptime(),
  );

  assert.deepEqual(actual, data);
});

test('permission errors propagate to the query error state instead of returning estimates', async () => {
  await withAdapter(
    async (config) => {
      throw new AxiosError('Forbidden', 'ERR_BAD_RESPONSE', config, undefined, {
        config,
        status: 403,
        statusText: 'Forbidden',
        headers: {},
        data: { message: 'forbidden' },
      });
    },
    async () => {
      await assert.rejects(
        statisticsServices.getFleetUsage(),
        (error: unknown) => error instanceof AxiosError && error.response?.status === 403,
      );
    },
  );
});
