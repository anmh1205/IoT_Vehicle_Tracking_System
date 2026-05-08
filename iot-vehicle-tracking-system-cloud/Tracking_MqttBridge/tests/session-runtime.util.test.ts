import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUseRunningStatusForSession,
  hasAuthoritativeSessionIdentity,
  isEngineOffRuntimeState,
  normalizeStatusForSessionRuntime,
  telemetryReportsEngineOff,
} from '../src/utils/session-runtime.util';
import type { RuntimeStateSnapshot } from '../src/types/device-state.types';

const runtimeState = (
  overrides: Partial<RuntimeStateSnapshot>,
): RuntimeStateSnapshot => ({
  ignition_state: 'UNKNOWN',
  motion_state: 'UNKNOWN',
  vehicle_state: 'UNKNOWN',
  device_state: 'ACTIVE',
  sleep_mode: 'NONE',
  ...overrides,
});

test('isEngineOffRuntimeState treats parked and rolling ignition-off states as engine off', () => {
  assert.equal(isEngineOffRuntimeState(runtimeState({ ignition_state: 'OFF' })), true);
  assert.equal(isEngineOffRuntimeState(runtimeState({ vehicle_state: 'PARKED_OFF' })), true);
  assert.equal(isEngineOffRuntimeState(runtimeState({ vehicle_state: 'ROLLING_IGN_OFF' })), true);
  assert.equal(isEngineOffRuntimeState(runtimeState({ ignition_state: 'ON', vehicle_state: 'IDLING_ON' })), false);
  assert.equal(isEngineOffRuntimeState(runtimeState({ ignition_state: 'ON', vehicle_state: 'MOVING_ON' })), false);
});

test('telemetryReportsEngineOff lets explicit ignition false override stale running status', () => {
  assert.equal(
    telemetryReportsEngineOff({
      ignition: false,
      runtimeState: runtimeState({ ignition_state: 'UNKNOWN', vehicle_state: 'UNKNOWN' }),
    }),
    true,
  );

  assert.equal(
    telemetryReportsEngineOff({
      ignition: true,
      runtimeState: runtimeState({ ignition_state: 'ON', vehicle_state: 'IDLING_ON' }),
    }),
    false,
  );
});

test('hasAuthoritativeSessionIdentity only accepts real session identifiers', () => {
  assert.equal(hasAuthoritativeSessionIdentity({ localSessionKey: 12 }), true);
  assert.equal(hasAuthoritativeSessionIdentity({ canonicalSessionId: '57' }), true);
  assert.equal(hasAuthoritativeSessionIdentity({ canonicalSessionId: ' 57 ' }), true);
  assert.equal(hasAuthoritativeSessionIdentity({ localSessionKey: 0, canonicalSessionId: '0' }), false);
  assert.equal(hasAuthoritativeSessionIdentity({ localSessionKey: undefined, canonicalSessionId: undefined }), false);
});

test('authoritative identity keeps running status active across temporary engine-off runtime snapshots', () => {
  const parkedRuntime = runtimeState({ ignition_state: 'OFF', vehicle_state: 'PARKED_OFF' });

  assert.equal(
    canUseRunningStatusForSession({
      cachedStatus: 'running',
      runtimeState: parkedRuntime,
      hasAuthoritativeIdentity: true,
    }),
    true,
  );

  assert.equal(
    normalizeStatusForSessionRuntime({
      cachedStatus: 'running',
      runtimeState: parkedRuntime,
      hasAuthoritativeIdentity: true,
    }),
    'running',
  );
});

test('anonymous running status is coerced to stopped when runtime is explicitly engine off', () => {
  const parkedRuntime = runtimeState({ ignition_state: 'OFF', vehicle_state: 'PARKED_OFF' });

  assert.equal(
    canUseRunningStatusForSession({
      cachedStatus: 'running',
      runtimeState: parkedRuntime,
      hasAuthoritativeIdentity: false,
    }),
    false,
  );

  assert.equal(
    normalizeStatusForSessionRuntime({
      cachedStatus: 'running',
      runtimeState: parkedRuntime,
      hasAuthoritativeIdentity: false,
    }),
    'stopped',
  );
});
