import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEventLogTimestamp } from '../src/features/devices/lib/event-log-feed';

test('event log prefers event/device occurrence time over server ingest time', () => {
  assert.equal(
    resolveEventLogTimestamp({
      event_timestamp: '2026-01-01T08:00:00.000Z',
      device_timestamp: '2026-01-01T08:00:00.000Z',
      server_timestamp: '2026-01-03T08:00:00.000Z',
    }),
    '2026-01-01T08:00:00.000Z',
  );
});

test('event log falls back to device then server time for legacy rows', () => {
  assert.equal(
    resolveEventLogTimestamp({
      device_timestamp: '2026-01-02T08:00:00.000Z',
      server_timestamp: '2026-01-03T08:00:00.000Z',
    }),
    '2026-01-02T08:00:00.000Z',
  );
  assert.equal(
    resolveEventLogTimestamp({ server_timestamp: '2026-01-03T08:00:00.000Z' }),
    '2026-01-03T08:00:00.000Z',
  );
});
