vi.mock('@/infrastructure/database/queries');

import { findMany } from '@/infrastructure/database/queries';
import { getSessionTelemetry, getTelemetry } from './device-telemetry.service';

describe('device-telemetry.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('maps vehicleBattery to the canonical vehicle battery telemetry query', async () => {
    vi.mocked(findMany).mockResolvedValue([
      {
        telemetry_timestamp: new Date('2026-04-23T00:00:00.000Z'),
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
        telemetry_timestamp: new Date('2026-04-23T00:00:00.000Z'),
        value: null,
      },
      {
        telemetry_timestamp: new Date('2026-04-23T00:01:00.000Z'),
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

    expect(sql).toContain('COALESCE(device_timestamp, server_timestamp) AS telemetry_timestamp');
    expect(sql).toContain('COALESCE(device_timestamp, server_timestamp) BETWEEN $2 AND $3');
    expect(sql).toContain('ORDER BY telemetry_timestamp DESC, server_timestamp DESC');
    expect(sql).toContain('LIMIT 5000');
    expect(sql).toContain(') recent_points');
    expect(sql).toContain('ORDER BY telemetry_timestamp ASC');
  });

  it('returns exact session telemetry rows by session_id for route replay', async () => {
    vi.mocked(findMany).mockResolvedValue([
      {
        telemetry_timestamp: new Date('2026-05-10T18:54:43.000Z'),
        latitude: '20.99023622',
        longitude: '105.74042885',
        speed: '12.5',
        device_battery: '4.1',
        vehicle_battery: '12.7',
        temperature: null,
        engine_temperature: '92',
        error_code: null,
        imu_accel_delta_mps2: '0.02',
      },
    ]);

    const result = await getSessionTelemetry('TRACKER_001', 220);
    const [sql, params] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain('WITH target_session AS');
    expect(sql).toContain('e.session_id = s.id');
    expect(sql).toContain('e.session_id IS NULL');
    expect(sql).toContain("e.event_code = 'mqtt_bridge_rawdata'");
    expect(sql).toContain("context#>>'{raw_payload,data,latitude}'");
    expect(sql).toContain('LIMIT 10000');
    expect(params).toEqual(['TRACKER_001', 220]);
    expect(result).toEqual({
      sessionId: 220,
      data: [
        {
          timestamp: '2026-05-10T18:54:43.000Z',
          latitude: 20.99023622,
          longitude: 105.74042885,
          speed: 12.5,
          deviceBattery: 4.1,
          vehicleBattery: 12.7,
          temperature: null,
          engineTemperature: 92,
          errorCode: null,
          imuAccelDeltaMps2: 0.02,
        },
      ],
    });
  });
});
