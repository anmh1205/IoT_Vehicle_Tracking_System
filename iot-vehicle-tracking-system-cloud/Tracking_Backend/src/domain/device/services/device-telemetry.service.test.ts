vi.mock('@/infrastructure/database/queries');

import { findMany } from '@/infrastructure/database/queries';
import { getTelemetry } from './device-telemetry.service';

describe('device-telemetry.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('maps vehicleBattery to the canonical vehicle battery telemetry query', async () => {
    vi.mocked(findMany).mockResolvedValue([
      {
        server_timestamp: new Date('2026-04-23T00:00:00.000Z'),
        value: '12.45',
      },
    ]);

    const result = await getTelemetry('TRACKER_001', { metric: 'vehicleBattery' });
    const [sql] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain("context->>'vehicle_battery'");
    expect(result.metric).toBe('vehicleBattery');
    expect(result.data).toEqual([
      {
        timestamp: '2026-04-23T00:00:00.000Z',
        value: 12.45,
      },
    ]);
  });

  it('supports rpm alias through diagnostic signal data', async () => {
    vi.mocked(findMany).mockResolvedValue([]);

    const result = await getTelemetry('TRACKER_001', { metric: 'rpm' });
    const [sql] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain("diagnostics,signals,rpm");
    expect(result.metric).toBe('rpm');
  });

  it('falls back to IMU acceleration delta for unsupported metrics', async () => {
    vi.mocked(findMany).mockResolvedValue([]);

    const result = await getTelemetry('TRACKER_001', { metric: 'unsupported_metric' });
    const [sql] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain("context->>'imu_accel_delta_mps2'");
    expect(result.metric).toBe('imuAccelDeltaMps2');
  });

  it('skips null telemetry values instead of coercing them to zero', async () => {
    vi.mocked(findMany).mockResolvedValue([
      {
        server_timestamp: new Date('2026-04-23T00:00:00.000Z'),
        value: null,
      },
      {
        server_timestamp: new Date('2026-04-23T00:01:00.000Z'),
        value: '13.2',
      },
    ]);

    const result = await getTelemetry('TRACKER_001', { metric: 'vehicleBattery' });

    expect(result.data).toEqual([
      {
        timestamp: '2026-04-23T00:01:00.000Z',
        value: 13.2,
      },
    ]);
  });

  it('queries the newest telemetry points first before returning them in ascending order', async () => {
    vi.mocked(findMany).mockResolvedValue([]);

    await getTelemetry('TRACKER_001', { metric: 'latitude' });
    const [sql] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain('ORDER BY server_timestamp DESC');
    expect(sql).toContain('LIMIT 5000');
    expect(sql).toContain(') recent_points');
    expect(sql).toContain('ORDER BY server_timestamp ASC');
  });
});
