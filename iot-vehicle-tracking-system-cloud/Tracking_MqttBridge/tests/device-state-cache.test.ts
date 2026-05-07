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

test('resolveSessionId reuses a running session when legacy local session key has no boot id', () => {
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
    84,
  );
});
