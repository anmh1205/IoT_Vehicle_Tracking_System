import test from 'node:test';
import assert from 'node:assert/strict';
import { patchDeviceListCacheValue } from '../src/features/devices/hooks/use-device-realtime';
import type { Device } from '../src/features/devices/types';

const createDevice = (deviceId: string, overrides: Partial<Device> = {}): Device => ({
  id: Number(overrides.id ?? 1),
  deviceId,
  deviceName: deviceId,
  currentStatus: 'disconnected',
  ignitionState: null,
  motionState: null,
  vehicleState: null,
  deviceState: null,
  sleepMode: null,
  stateUpdatedAt: null,
  deviceAlerts: { source: 'device', count: 0, highestSeverity: 'none', titles: [] },
  ecuAlerts: { source: 'ecu', count: 0, highestSeverity: 'none', titles: [] },
  imei: null,
  firmwareVersion: null,
  targetFirmwareVersion: null,
  vehicleId: null,
  vehiclePlate: null,
  customerName: null,
  lastSeenAt: null,
  latitude: null,
  longitude: null,
  totalRuntimeSeconds: 0,
  requestInterval: 60,
  imuAccelDeltaThresholdMps2: 0,
  lastErrorCode: null,
  config: null,
  ...overrides,
});

test('patchDeviceListCacheValue patches flat device list caches', () => {
  const cache = {
    items: [createDevice('TRACKER_001')],
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  };

  const patched = patchDeviceListCacheValue(cache, 'TRACKER_001', {
    status: 'running',
    latitude: 20.99,
    longitude: 105.74,
    timestamp: Date.parse('2026-05-11T09:00:00.000Z'),
  });

  assert.notEqual(patched, cache);
  assert.equal(patched.items[0].currentStatus, 'running');
  assert.equal(patched.items[0].latitude, 20.99);
  assert.equal(patched.items[0].lastSeenAt, '2026-05-11T09:00:00.000Z');
});

test('patchDeviceListCacheValue patches infinite device list pages', () => {
  const cache = {
    pages: [
      {
        items: [createDevice('TRACKER_000')],
        pagination: { page: 1, limit: 1, total: 2, totalPages: 2 },
      },
      {
        items: [createDevice('TRACKER_001')],
        pagination: { page: 2, limit: 1, total: 2, totalPages: 2 },
      },
    ],
    pageParams: [1, 2],
  };

  const patched = patchDeviceListCacheValue(cache, 'TRACKER_001', {
    current_status: 'online',
    ignitionState: 'OFF',
    deviceAlerts: { count: 2, highestSeverity: 'high', titles: ['Pin yếu'] },
  });

  assert.notEqual(patched, cache);
  assert.equal(patched.pages[0], cache.pages[0]);
  assert.notEqual(patched.pages[1], cache.pages[1]);
  assert.equal(patched.pages[1].items[0].currentStatus, 'online');
  assert.equal(patched.pages[1].items[0].ignitionState, 'OFF');
  assert.equal(patched.pages[1].items[0].deviceAlerts.count, 2);
  assert.deepEqual(patched.pages[1].items[0].deviceAlerts.titles, ['Pin yếu']);
});

test('patchDeviceListCacheValue leaves unrelated device caches untouched', () => {
  const cache = {
    pages: [
      {
        items: [createDevice('TRACKER_000')],
        pagination: { page: 1, limit: 1, total: 1, totalPages: 1 },
      },
    ],
    pageParams: [1],
  };

  assert.equal(
    patchDeviceListCacheValue(cache, 'TRACKER_404', { status: 'running' }),
    cache,
  );
});
