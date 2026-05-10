import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countRouteReplayPointsForSession,
  filterTelemetryRowsBySession,
} from '../src/features/devices/components/device-detail-modal/telemetry-insights';
import type { DeviceSession, DeviceTelemetryRow } from '../src/features/devices/types';

const createSession = (overrides: Partial<DeviceSession> = {}): DeviceSession => ({
  id: 168,
  status: 'completed',
  serverSessionStart: '2026-05-10T10:42:37.966Z',
  serverSessionEnd: '2026-05-10T10:44:05.442Z',
  sessionStart: '2026-05-10T10:42:20.000Z',
  sessionEnd: '2026-05-10T10:44:04.000Z',
  localSessionKey: 2,
  firmwareBootId: 'boot-1-93d52350',
  canonicalSource: 'firmware',
  boundarySource: 'firmware',
  startReason: 'ignition_on',
  endReason: 'ignition_off',
  uptime: 104,
  avgImuAccelDeltaMps2: null,
  dataPointsCount: 2,
  ...overrides,
});

const createRow = (timestamp: string, latitude: number | null = 20.99023622): DeviceTelemetryRow => ({
  timestamp,
  latitude,
  longitude: latitude === null ? null : 105.74042885,
  speed: null,
  deviceBattery: null,
  vehicleBattery: null,
  temperature: null,
  engineTemperature: null,
  errorCode: null,
  imuAccelDeltaMps2: null,
});

test('filterTelemetryRowsBySession uses firmware session timestamps before server timestamps', () => {
  const rows = [
    createRow('2026-05-10T10:42:21.000Z', null),
    createRow('2026-05-10T10:44:04.000Z'),
  ];

  assert.deepEqual(filterTelemetryRowsBySession(rows, createSession()), rows);
});

test('filterTelemetryRowsBySession tolerates small server timestamp drift when firmware window is missing', () => {
  const row = createRow('2026-05-10T10:44:05.482Z');
  const session = createSession({
    sessionStart: null,
    sessionEnd: null,
  });

  assert.deepEqual(filterTelemetryRowsBySession([row], session), [row]);
});

test('filterTelemetryRowsBySession rejects telemetry outside the session window', () => {
  const outsideRow = createRow('2026-05-10T10:46:10.000Z');

  assert.deepEqual(filterTelemetryRowsBySession([outsideRow], createSession()), []);
});

test('countRouteReplayPointsForSession counts GPS rows, not non-coordinate session events', () => {
  const rows = [
    createRow('2026-05-10T10:42:21.000Z', null),
    createRow('2026-05-10T10:43:00.000Z', 20.99023622),
    createRow('2026-05-10T10:44:04.000Z', 20.99033622),
  ];

  assert.equal(countRouteReplayPointsForSession(rows, createSession()), 2);
});

test('countRouteReplayPointsForSession exposes one GPS point as not replayable yet', () => {
  const rows = [
    createRow('2026-05-10T10:42:21.000Z', null),
    createRow('2026-05-10T10:44:04.000Z'),
  ];

  assert.equal(countRouteReplayPointsForSession(rows, createSession()), 1);
});
