vi.mock('@/infrastructure/database/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('@/infrastructure/database/queries', () => ({
  findMany: vi.fn(),
  findOne: vi.fn(),
}));

import { findMany, findOne } from '@/infrastructure/database/queries';
import { pool } from '@/infrastructure/database/pool';
import {
  findByDeviceIdPaginated,
  findCurrentSession,
  getSessionStats,
} from './device-session.repository';

describe('device-session.repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('includes canonical GPS point counts for paginated sessions', async () => {
    vi.mocked(findMany).mockResolvedValue([]);

    await findByDeviceIdPaginated('TRACKER_001', 2, 20);

    const [sql, params] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain('gps_points_count');
    expect(sql).toContain('LEFT JOIN LATERAL');
    expect(sql).toContain("context#>>'{raw_payload,data,latitude}'");
    expect(sql).toContain("context->>'latitude'");
    expect(sql).toContain("context#>>'{raw_payload,data,longitude}'");
    expect(sql).toContain('e.session_id = s.id');
    expect(sql).toContain("e.event_code = 'mqtt_bridge_rawdata'");
    expect(sql).not.toContain('e.session_id IS NULL');
    expect(sql).not.toContain("INTERVAL '60 seconds'");
    expect(params).toEqual(['TRACKER_001', 20, 20]);
  });

  it('adds GPS counts to the current running session query', async () => {
    vi.mocked(findOne).mockResolvedValue(null);

    await findCurrentSession('TRACKER_001');

    const [sql, params] = vi.mocked(findOne).mock.calls[0] ?? [];

    expect(sql).toContain("s.status = 'running'");
    expect(sql).toContain('gps_points_count');
    expect(params).toEqual(['TRACKER_001']);
  });

  it('weights device IMU average by session sample counts', async () => {
    vi.mocked(pool.query).mockResolvedValue({
      rows: [{
        total_sessions: '2',
        avg_uptime: '100',
        avg_imu_accel_delta_mps2: '1.75',
        total_data_points: '101',
      }],
    } as any);

    await getSessionStats('TRACKER_001');

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('imu_accel_samples_count');
    expect(sql).toContain('SUM(');
    expect(sql).toContain('NULLIF(');
    expect(sql).not.toContain('AVG(avg_imu_accel_delta_mps2)');
    expect(params).toEqual(['TRACKER_001']);
  });
});
