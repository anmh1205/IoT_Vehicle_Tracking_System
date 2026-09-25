import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePayloadTimestamp } from '../src/utils/timestamp.util';

const NOW_MS = Date.UTC(2026, 8, 25, 8, 0, 0);

test('preserves a plausible payload timestamp older than the live skew window', () => {
  const historicalMs = NOW_MS - 7 * 24 * 60 * 60 * 1000;

  assert.deepEqual(normalizePayloadTimestamp(historicalMs, historicalMs, NOW_MS), {
    timestampMs: historicalMs,
    source: 'payload_historical',
  });
});

test('preserves historical metadata time when payload time is invalid', () => {
  const historicalMs = NOW_MS - 10 * 24 * 60 * 60 * 1000;

  assert.deepEqual(normalizePayloadTimestamp(0, historicalMs, NOW_MS), {
    timestampMs: historicalMs,
    source: 'metadata_sent_at_historical',
  });
});

test('prefers a recent metadata timestamp over an implausibly old payload timestamp', () => {
  const recentMetadataMs = NOW_MS - 60_000;

  assert.deepEqual(normalizePayloadTimestamp(1, recentMetadataMs, NOW_MS), {
    timestampMs: recentMetadataMs,
    source: 'metadata_sent_at',
  });
});

test('falls back to server time when neither timestamp is plausible', () => {
  assert.deepEqual(normalizePayloadTimestamp(1, 2, NOW_MS), {
    timestampMs: NOW_MS,
    source: 'server_now',
  });
});

test('keeps future-skew protection', () => {
  const futureMs = NOW_MS + 60 * 60 * 1000;

  assert.deepEqual(normalizePayloadTimestamp(futureMs, undefined, NOW_MS), {
    timestampMs: NOW_MS,
    source: 'server_now',
  });
});
