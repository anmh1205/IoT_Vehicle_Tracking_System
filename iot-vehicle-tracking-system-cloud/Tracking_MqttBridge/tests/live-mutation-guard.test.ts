import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldAcceptLiveMutation } from '../src/utils/session-runtime.util';

test('accepts live mutation when no watermark exists', () => {
  const decision = shouldAcceptLiveMutation({
    incomingTimestampMs: 1_000,
  });

  assert.equal(decision.accept, true);
  assert.equal(decision.reason, 'fresh');
  assert.equal(decision.watermarkMs, null);
});

test('rejects stale timestamp behind persisted watermark', () => {
  const decision = shouldAcceptLiveMutation({
    incomingTimestampMs: 100_000,
    persistedWatermarkMs: 140_000,
  });

  assert.equal(decision.accept, false);
  assert.equal(decision.reason, 'stale_timestamp');
  assert.equal(decision.watermarkMs, 140_000);
});

test('rejects lower sequence number on the same boot lineage', () => {
  const decision = shouldAcceptLiveMutation({
    incomingTimestampMs: 200_000,
    incomingSeqNo: 18,
    incomingRuntimeBootId: 'boot-a',
    cachedLastPayloadTimestampMs: 190_000,
    cachedLastSeqNo: 24,
    cachedRuntimeBootId: 'boot-a',
  });

  assert.equal(decision.accept, false);
  assert.equal(decision.reason, 'stale_seq');
});

test('rejects conflicting session identity that arrives no newer than current lineage', () => {
  const decision = shouldAcceptLiveMutation({
    incomingTimestampMs: 200_000,
    incomingRuntimeBootId: 'runtime-a',
    incomingSessionBootId: 'session-a',
    incomingLocalSessionKey: 9,
    cachedLastPayloadTimestampMs: 200_000,
    cachedRuntimeBootId: 'runtime-a',
    cachedSessionBootId: 'session-a',
    cachedLocalSessionKey: 10,
  });

  assert.equal(decision.accept, false);
  assert.equal(decision.reason, 'stale_session_identity');
});

test('accepts sequence reset on a new runtime boot while session identity is preserved', () => {
  const decision = shouldAcceptLiveMutation({
    incomingTimestampMs: 201_000,
    incomingSeqNo: 1,
    incomingRuntimeBootId: 'runtime-b',
    incomingSessionBootId: 'session-a',
    incomingLocalSessionKey: 10,
    cachedLastPayloadTimestampMs: 200_000,
    cachedLastSeqNo: 24,
    cachedRuntimeBootId: 'runtime-a',
    cachedSessionBootId: 'session-a',
    cachedLocalSessionKey: 10,
  });

  assert.equal(decision.accept, true);
  assert.equal(decision.reason, 'fresh');
});

test('still rejects lower sequence numbers within one physical runtime boot', () => {
  const decision = shouldAcceptLiveMutation({
    incomingTimestampMs: 201_000,
    incomingSeqNo: 1,
    incomingRuntimeBootId: 'runtime-a',
    incomingSessionBootId: 'session-a',
    cachedLastPayloadTimestampMs: 200_000,
    cachedLastSeqNo: 24,
    cachedRuntimeBootId: 'runtime-a',
    cachedSessionBootId: 'session-a',
  });

  assert.equal(decision.accept, false);
  assert.equal(decision.reason, 'stale_seq');
});
