import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canHydrateSessionIdentity,
  hasSessionIdentityConflict,
  resolveLocalSessionKey,
} from '../src/utils/session-identity.util';

test('resolveLocalSessionKey falls back to legacy session_id when needed', () => {
  assert.equal(resolveLocalSessionKey(undefined, 17), 17);
  assert.equal(resolveLocalSessionKey(23, 17), 23);
  assert.equal(resolveLocalSessionKey(undefined, undefined), undefined);
});

test('hasSessionIdentityConflict detects local session key and boot mismatches', () => {
  assert.equal(
    hasSessionIdentityConflict(
      { localSessionKey: 12, bootId: 'boot-a' },
      { localSessionKey: 12, bootId: 'boot-a' },
    ),
    false,
  );
  assert.equal(
    hasSessionIdentityConflict(
      { localSessionKey: 12, bootId: 'boot-a' },
      { localSessionKey: 19, bootId: 'boot-a' },
    ),
    true,
  );
  assert.equal(
    hasSessionIdentityConflict(
      { localSessionKey: 12, bootId: 'boot-a' },
      { localSessionKey: 12, bootId: 'boot-b' },
    ),
    true,
  );
});

test('canHydrateSessionIdentity allows filling missing identity on compatible fallback sessions', () => {
  assert.equal(
    canHydrateSessionIdentity(
      { localSessionKey: undefined, bootId: 'boot-a' },
      { localSessionKey: 31, bootId: 'boot-a' },
    ),
    true,
  );
  assert.equal(
    canHydrateSessionIdentity(
      { localSessionKey: undefined, bootId: undefined },
      { localSessionKey: 31, bootId: 'boot-a' },
    ),
    true,
  );
  assert.equal(
    canHydrateSessionIdentity(
      { localSessionKey: undefined, bootId: 'boot-old' },
      { localSessionKey: 31, bootId: 'boot-new' },
    ),
    false,
  );
});
