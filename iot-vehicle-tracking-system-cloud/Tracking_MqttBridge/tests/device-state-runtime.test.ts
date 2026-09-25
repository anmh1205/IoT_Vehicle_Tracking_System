import test from 'node:test';
import assert from 'node:assert/strict';
import { setStatus, getStatus } from '../src/cache/device-state.cache';

test('setStatus keeps runtime state and session for running status updates', () => {
  const deviceId = 'runtime-cache-device';

  setStatus(deviceId, 'running', {
    sessionId: 123,
    runtimeState: {
      ignition_state: 'ON',
      motion_state: 'MOVING',
      vehicle_state: 'MOVING_ON',
      device_state: 'ACTIVE',
      sleep_mode: 'NONE',
    },
  });

  const state = getStatus(deviceId);
  assert.equal(state?.status, 'running');
  assert.equal(state?.sessionId, 123);
  assert.equal(state?.runtimeState?.ignition_state, 'ON');
  assert.equal(state?.runtimeState?.motion_state, 'MOVING');
});

test('setStatus keeps runtime boot separate from session boot identity', () => {
  const deviceId = 'runtime-cache-boot-lineage';
  setStatus(deviceId, 'running', {
    sessionId: 42,
    bootId: 'session-boot-a',
    runtimeBootId: 'runtime-boot-b',
    lastSeqNo: 1,
  });

  const state = getStatus(deviceId);
  assert.equal(state?.bootId, 'session-boot-a');
  assert.equal(state?.runtimeBootId, 'runtime-boot-b');
});
