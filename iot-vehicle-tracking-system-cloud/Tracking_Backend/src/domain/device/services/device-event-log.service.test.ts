vi.mock('@/infrastructure/database/queries');

import { findMany } from '@/infrastructure/database/queries';
import { listEventLogs } from './device-event-log.service';

describe('device-event-log.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('scopes event logs by exact device id and orders by effective device time', async () => {
    vi.mocked(findMany)
      .mockResolvedValueOnce([
        {
          id: 7,
          correlation_id: 'corr-7',
          device_id: 'TRACKER_001',
          session_id: 3,
          event_type: 'status_change',
          event_code: 'mqtt_bridge_rawdata',
          severity: 'info',
          context: {},
          metadata: {},
          message: 'replayed',
          device_timestamp: new Date('2026-01-01T08:00:00.000Z'),
          server_timestamp: new Date('2026-01-03T08:00:00.000Z'),
          created_at: new Date('2026-01-03T08:00:00.000Z'),
          event_timestamp: new Date('2026-01-01T08:00:00.000Z'),
        },
      ] as any)
      .mockResolvedValueOnce([{ total: 1 }]);

    const result = await listEventLogs('TRACKER_001', 1, 20);

    const [sql, params] = vi.mocked(findMany).mock.calls[0];
    expect(sql).toContain('WHERE device_id = $1');
    expect(sql).toContain('COALESCE(device_timestamp, server_timestamp) AS event_timestamp');
    expect(sql).toContain('ORDER BY event_timestamp DESC, server_timestamp DESC, id DESC');
    expect(sql).not.toContain('ILIKE');
    expect(params).toEqual(['TRACKER_001', 20, 0]);

    expect(result.items[0]).toMatchObject({
      device_id: 'TRACKER_001',
      event_timestamp: '2026-01-01T08:00:00.000Z',
      device_timestamp: '2026-01-01T08:00:00.000Z',
      server_timestamp: '2026-01-03T08:00:00.000Z',
    });
  });

  it('bounds invalid pagination instead of producing an unsafe query window', async () => {
    vi.mocked(findMany)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ total: 0 }]);

    const result = await listEventLogs('TRACKER_001', Number.NaN, 5000);

    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(100);
    expect(vi.mocked(findMany).mock.calls[0][1]).toEqual(['TRACKER_001', 100, 0]);
  });
});
