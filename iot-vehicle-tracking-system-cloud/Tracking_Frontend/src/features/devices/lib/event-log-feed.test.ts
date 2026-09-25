import { describe, expect, it } from 'vitest';
import { resolveEventLogTimestamp } from './event-log-feed';

describe('resolveEventLogTimestamp', () => {
  it('prefers effective/device occurrence time over server ingest time', () => {
    expect(
      resolveEventLogTimestamp({
        event_timestamp: '2026-01-01T08:00:00.000Z',
        device_timestamp: '2026-01-01T08:00:00.000Z',
        server_timestamp: '2026-01-03T08:00:00.000Z',
      }),
    ).toBe('2026-01-01T08:00:00.000Z');
  });

  it('falls back to device then server time for legacy rows', () => {
    expect(
      resolveEventLogTimestamp({
        device_timestamp: '2026-01-02T08:00:00.000Z',
        server_timestamp: '2026-01-03T08:00:00.000Z',
      }),
    ).toBe('2026-01-02T08:00:00.000Z');

    expect(
      resolveEventLogTimestamp({
        server_timestamp: '2026-01-03T08:00:00.000Z',
      }),
    ).toBe('2026-01-03T08:00:00.000Z');
  });
});
