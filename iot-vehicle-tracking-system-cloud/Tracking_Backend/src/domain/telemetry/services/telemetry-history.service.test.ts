vi.mock('@/infrastructure/database/queries');

import { findMany } from '@/infrastructure/database/queries';
import { getTelemetryHistory } from './telemetry-history.service';

describe('telemetry-history.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters, orders and timestamps history by device event time', async () => {
    vi.mocked(findMany).mockResolvedValue([
      {
        telemetry_timestamp: new Date('2026-01-01T08:00:00.000Z'),
        server_timestamp: new Date('2026-01-03T08:00:00.000Z'),
        context: { position_valid: true, latitude: 10.77, longitude: 106.70, speed: 42 },
        metadata: {},
        normalized_latitude: '10.77',
        normalized_longitude: '106.70',
        normalized_speed: '42',
        normalized_course: null,
      },
    ] as any);

    const result = await getTelemetryHistory({
      deviceId: 'TRACKER_001',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-02T00:00:00.000Z',
    });

    const [sql, params] = vi.mocked(findMany).mock.calls[0];
    expect(sql).toContain('COALESCE(device_timestamp, server_timestamp) AS telemetry_timestamp');
    expect(sql).toContain('COALESCE(device_timestamp, server_timestamp) BETWEEN $2 AND $3');
    expect(sql).toContain('ORDER BY telemetry_timestamp ASC, server_timestamp ASC, id ASC');
    expect(params).toEqual([
      'TRACKER_001',
      '2026-01-01T00:00:00.000Z',
      '2026-01-02T00:00:00.000Z',
    ]);

    expect(result.points[0]).toMatchObject({
      ts: Date.parse('2026-01-01T08:00:00.000Z') / 1000,
      timestamp: '2026-01-01T08:00:00.000Z',
      latitude: 10.77,
      longitude: 106.70,
      speed: 42,
    });
  });

  it('does not resurrect raw rejected GNSS when normalized position is absent', async () => {
    vi.mocked(findMany).mockResolvedValue([
      {
        telemetry_timestamp: new Date('2026-01-01T08:00:00.000Z'),
        server_timestamp: new Date('2026-01-01T08:00:01.000Z'),
        context: {
          position_valid: false,
          raw_payload: {
            data: {
              latitude: 21.0245,
              longitude: 105.8412,
              speed: 99,
            },
          },
        },
        metadata: {},
        normalized_latitude: null,
        normalized_longitude: null,
        normalized_speed: null,
        normalized_course: null,
      },
    ] as any);

    const result = await getTelemetryHistory({
      deviceId: 'TRACKER_001',
      fields: 'latitude,longitude,speed',
    });

    const [sql] = vi.mocked(findMany).mock.calls[0];
    expect(sql).toContain("context ? 'position_valid'");
    expect(result.points[0]).toMatchObject({
      latitude: null,
      longitude: null,
      speed: null,
    });
  });
});
