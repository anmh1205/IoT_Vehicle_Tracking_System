import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canUseRunningStatusForSession,
  hasAuthoritativeSessionIdentity,
  isEngineOffRuntimeState,
  normalizeStatusForSessionRuntime,
  shouldEnsureSessionForTelemetry,
  shouldRetainSessionHistory,
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

test('hasAuthoritativeSessionIdentity requires canonical id or boot-scoped local key', () => {
  assert.equal(hasAuthoritativeSessionIdentity({ localSessionKey: 12 }), false);
  assert.equal(hasAuthoritativeSessionIdentity({ localSessionKey: 12, bootId: 'boot-a' }), true);
  assert.equal(hasAuthoritativeSessionIdentity({ canonicalSessionId: '57' }), true);
  assert.equal(hasAuthoritativeSessionIdentity({ canonicalSessionId: ' 57 ' }), true);
  assert.equal(hasAuthoritativeSessionIdentity({ localSessionKey: 0, canonicalSessionId: '0', bootId: 'boot-a' }), false);
  assert.equal(
    hasAuthoritativeSessionIdentity({ localSessionKey: undefined, canonicalSessionId: undefined, bootId: 'boot-a' }),
    false,
  );
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

test('stale telemetry with a resolved authoritative session is retained for session history only', () => {
  assert.equal(
    shouldRetainSessionHistory({
      liveMutationAccepted: false,
      resolvedSessionId: 155,
      hasAuthoritativeIdentity: true,
    }),
    true,
  );
  assert.equal(
    shouldRetainSessionHistory({
      liveMutationAccepted: true,
      resolvedSessionId: 155,
      hasAuthoritativeIdentity: true,
    }),
    false,
  );
  assert.equal(
    shouldRetainSessionHistory({
      liveMutationAccepted: false,
      resolvedSessionId: null,
      hasAuthoritativeIdentity: true,
    }),
    false,
  );
  assert.equal(
    shouldRetainSessionHistory({
      liveMutationAccepted: false,
      resolvedSessionId: 155,
      hasAuthoritativeIdentity: false,
    }),
    false,
  );
});

test('anonymous engine-off telemetry is not retained as completed session history', () => {
  assert.equal(
    shouldRetainSessionHistory({
      liveMutationAccepted: true,
      resolvedSessionId: null,
      hasAuthoritativeIdentity: false,
    }),
    false,
  );
  assert.equal(
    shouldRetainSessionHistory({
      liveMutationAccepted: false,
      resolvedSessionId: 155,
      hasAuthoritativeIdentity: false,
    }),
    false,
  );
});

test('active firmware telemetry with unresolved identity can ensure a session', () => {
  assert.equal(
    shouldEnsureSessionForTelemetry({
      liveMutationAccepted: true,
      resolvedSessionId: null,
      hasAuthoritativeIdentity: true,
      hasFallbackIdentity: true,
      isActiveTelemetry: true,
    }),
    true,
  );

  assert.equal(
    shouldEnsureSessionForTelemetry({
      liveMutationAccepted: true,
      resolvedSessionId: null,
      hasAuthoritativeIdentity: false,
      hasFallbackIdentity: true,
      isActiveTelemetry: true,
    }),
    true,
  );
});

test('engine-off heartbeat cannot create a telemetry fallback session', () => {
  assert.equal(
    shouldEnsureSessionForTelemetry({
      liveMutationAccepted: true,
      resolvedSessionId: null,
      hasAuthoritativeIdentity: true,
      hasFallbackIdentity: true,
      isActiveTelemetry: false,
    }),
    false,
  );

  assert.equal(
    shouldEnsureSessionForTelemetry({
      liveMutationAccepted: true,
      resolvedSessionId: 155,
      hasAuthoritativeIdentity: true,
      hasFallbackIdentity: true,
      isActiveTelemetry: true,
    }),
    false,
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
