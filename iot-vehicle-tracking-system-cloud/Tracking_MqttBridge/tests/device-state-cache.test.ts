import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSessionId, setStatus } from '../src/cache/device-state.cache';

test('resolveSessionId reuses a running session when only boot_id is available', () => {
  const deviceId = 'device-cache-boot-only';
  setStatus(deviceId, 'running', {
    sessionId: 42,
    localSessionKey: 7,
    canonicalSessionId: '42',
    bootId: 'boot-42',
  });

  assert.equal(
    resolveSessionId(deviceId, {
      bootId: 'boot-42',
    }),
    42,
  );
});

test('resolveSessionId does not reuse a boot-scoped session from local key alone', () => {
  const deviceId = 'device-cache-local-only';
  setStatus(deviceId, 'running', {
    sessionId: 84,
    localSessionKey: 9,
    canonicalSessionId: '84',
    bootId: 'boot-84',
  });

  assert.equal(
    resolveSessionId(deviceId, {
      localSessionKey: 9,
    }),
    null,
  );
});

test('resolveSessionId still supports legacy local-only running sessions', () => {
  const deviceId = 'device-cache-legacy-local-only';
  setStatus(deviceId, 'running', {
    sessionId: 85,
    localSessionKey: 9,
    canonicalSessionId: null,
    bootId: null,
  });

  assert.equal(
    resolveSessionId(deviceId, {
      localSessionKey: 9,
    }),
    85,
  );
});

test('resolveSessionId reuses a local key when boot id matches', () => {
  const deviceId = 'device-cache-local-boot-match';
  setStatus(deviceId, 'running', {
    sessionId: 86,
    localSessionKey: 10,
    canonicalSessionId: null,
    bootId: 'boot-86',
  });

  assert.equal(
    resolveSessionId(deviceId, {
      localSessionKey: 10,
      bootId: 'boot-86',
    }),
    86,
  );
  assert.equal(
    resolveSessionId(deviceId, {
      localSessionKey: 10,
      bootId: 'boot-other',
    }),
    null,
  );
});
