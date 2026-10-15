import test from 'node:test';
import assert from 'node:assert/strict';
import { saveNativeAuthToken, clearNativeAuthToken } from '../src/lib/native-auth';

test('regular web sessions do not require a native bridge', async () => {
  await saveNativeAuthToken('test-token', undefined);
  await clearNativeAuthToken(undefined);
  await saveNativeAuthToken('test-token', { isNativeApp: () => false });
});

test('native session persists each new credential before proceeding', async () => {
  const saved: string[] = [];
  await saveNativeAuthToken('first-token', {
    isNativeApp: () => true,
    saveToken: async (token) => { saved.push(token); },
  });
  await saveNativeAuthToken('rotated-token', {
    isNativeApp: () => true,
    saveToken: async (token) => { saved.push(token); },
  });
  assert.deepEqual(saved, ['first-token', 'rotated-token']);
});

test('native session deletion is awaited', async () => {
  let deleted = false;
  await clearNativeAuthToken({
    isNativeApp: () => true,
    logout: async () => { deleted = true; },
  });
  assert.equal(deleted, true);
});

test('native storage errors remain visible to the caller', async () => {
  await assert.rejects(saveNativeAuthToken('secret', {
    isNativeApp: () => true,
    saveToken: async () => { throw new Error('storage failed'); },
  }), /storage failed/);
  await assert.rejects(clearNativeAuthToken({
    isNativeApp: () => true,
    logout: async () => { throw new Error('delete failed'); },
  }), /delete failed/);
});

test('incomplete native bridge cannot silently acknowledge credential work', async () => {
  await assert.rejects(
    saveNativeAuthToken('secret', { isNativeApp: () => true }),
    /unavailable/,
  );
  await assert.rejects(
    clearNativeAuthToken({ isNativeApp: () => true }),
    /unavailable/,
  );
});
