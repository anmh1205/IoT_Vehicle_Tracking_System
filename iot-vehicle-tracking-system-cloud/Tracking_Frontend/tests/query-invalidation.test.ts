import test from 'node:test';
import assert from 'node:assert/strict';
import { queryInvalidation } from '../src/lib/utils/query-invalidation';

const createQueryClient = () => {
  const keys: unknown[][] = [];
  const queryClient = {
    invalidateQueries: ({ queryKey }: { queryKey: unknown[] }) => {
      keys.push(queryKey);
      return Promise.resolve();
    },
  };

  return { queryClient, keys };
};

test('device telemetry invalidation includes the active tracking telemetry key', () => {
  const { queryClient, keys } = createQueryClient();

  queryInvalidation.device.telemetry(queryClient as any, 'TRACKER_001');

  assert.deepEqual(keys, [
    ['device-telemetry', 'TRACKER_001'],
    ['device-tracking-telemetry', 'TRACKER_001'],
    ['device-position-snapshot', 'TRACKER_001'],
    ['device-positions'],
  ]);
});

test('device-wide invalidation refreshes list, map, and detail surfaces', () => {
  const { queryClient, keys } = createQueryClient();

  queryInvalidation.device.all(queryClient as any, 'TRACKER_001');

  assert.deepEqual(keys, [
    ['devices'],
    ['device-positions'],
    ['device', 'TRACKER_001'],
    ['device-detail', 'TRACKER_001'],
    ['device-sessions', 'TRACKER_001'],
    ['device-runtime-chart', 'TRACKER_001'],
    ['device-imu-accel-delta-chart', 'TRACKER_001'],
    ['device-tracking-telemetry', 'TRACKER_001'],
    ['device-position-snapshot', 'TRACKER_001'],
  ]);
});
