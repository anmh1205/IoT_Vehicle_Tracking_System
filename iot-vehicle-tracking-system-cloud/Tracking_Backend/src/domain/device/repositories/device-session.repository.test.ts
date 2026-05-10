vi.mock('@/infrastructure/database/queries', () => ({
  findMany: vi.fn(),
  findOne: vi.fn(),
}));

import { findMany, findOne } from '@/infrastructure/database/queries';
import {
  findByDeviceIdPaginated,
  findCurrentSession,
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
    expect(sql).toContain('e.session_id IS NULL');
    expect(sql).toContain("INTERVAL '60 seconds'");
    expect(sql).toContain("context#>>'{raw_payload,boot_id}'");
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
});
