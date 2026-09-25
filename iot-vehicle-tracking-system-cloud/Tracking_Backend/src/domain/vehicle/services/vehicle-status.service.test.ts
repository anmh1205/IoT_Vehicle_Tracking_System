vi.mock('@/infrastructure/database/pool', () => ({
  pool: { query: vi.fn() },
}));

vi.mock('@/infrastructure/database/queries', () => ({
  findOne: vi.fn(),
  findMany: vi.fn(),
}));

import { findMany, findOne } from '@/infrastructure/database/queries';
import { getVehicleStatus } from './vehicle-status.service';

describe('vehicle-status.service latest telemetry', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses only live-mutation telemetry ordered by device time', async () => {
    vi.mocked(findOne)
      .mockResolvedValueOnce({
        id: 9,
        vehicle_id: 'VEH_001',
        device_id: 'TRACKER_001',
        status: 'active',
      } as any)
      .mockResolvedValueOnce({
        device_id: 'TRACKER_001',
        current_status: 'running',
        last_seen_at: new Date('2026-01-03T08:00:00.000Z'),
        last_latitude: 10.77,
        last_longitude: 106.70,
        last_speed: 42,
      } as any)
      .mockResolvedValueOnce({
        latitude: 10.77,
        longitude: 106.70,
        speed: 42,
        course: 90,
        device_battery: 4.0,
        telemetry_timestamp: new Date('2026-01-03T07:59:00.000Z'),
        server_timestamp: new Date('2026-01-03T08:00:01.000Z'),
      } as any)
      .mockResolvedValueOnce(null);

    vi.mocked(findMany).mockResolvedValue([]);

    const result = await getVehicleStatus(9);

    const [telemetrySql] = vi.mocked(findOne).mock.calls[2];
    expect(telemetrySql).toContain("COALESCE((context->>'live_mutation')::boolean, true)");
    expect(telemetrySql).toContain(
      'ORDER BY COALESCE(device_timestamp, server_timestamp) DESC, server_timestamp DESC, id DESC',
    );
    expect(result.currentLocation?.timestamp).toBe('2026-01-03T07:59:00.000Z');
    expect(result.currentLocation?.lat).toBe(10.77);
  });
});
