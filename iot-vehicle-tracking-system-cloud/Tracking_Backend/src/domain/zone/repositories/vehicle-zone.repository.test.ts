vi.mock('@/infrastructure/database/queries', () => ({
  findOne: vi.fn(),
  findMany: vi.fn(),
  insertOne: vi.fn(),
}));

import { findOne } from '@/infrastructure/database/queries';
import { getVehiclePositionSnapshot } from './vehicle-zone.repository';

describe('vehicle-zone.repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(findOne).mockResolvedValue(null);
  });

  it('uses latest device coordinates when building a vehicle zone preview', async () => {
    await getVehiclePositionSnapshot('XE-TEST');

    const [sql, params] = vi.mocked(findOne).mock.calls[0] ?? [];

    expect(sql).toContain('COALESCE(d.last_latitude, d.latitude)::double precision AS latitude');
    expect(sql).toContain('COALESCE(d.last_longitude, d.longitude)::double precision AS longitude');
    expect(params).toEqual(['XE-TEST']);
  });
});
