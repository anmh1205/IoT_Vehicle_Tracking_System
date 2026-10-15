vi.mock('@/infrastructure/database/queries');
vi.mock('@/domain/device/services/device-access.service', () => ({
  canAccessDeviceId: vi.fn(),
  hasGlobalDeviceAccess: vi.fn((actor: { role: string; deviceAccessMode: string }) =>
    actor.role === 'root' || actor.role === 'admin' || actor.deviceAccessMode === 'all',
  ),
}));

import { findMany } from '@/infrastructure/database/queries';
import { canAccessDeviceId } from '@/domain/device/services/device-access.service';
import type { SessionUser } from '@/shared/types/common.types';
import { getTelemetryHistory } from './telemetry-history.service';

const ADMIN: SessionUser = { id: 1, username: 'admin', role: 'admin', deviceAccessMode: 'all' };
const SCOPED: SessionUser = { id: 22, username: 'operator', role: 'operator', deviceAccessMode: 'assigned' };

describe('telemetry-history.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(canAccessDeviceId).mockResolvedValue(true);
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
      actor: ADMIN,
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
      actor: ADMIN,
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
  it('denies unassigned device history before touching event_logs', async () => {
    vi.mocked(canAccessDeviceId).mockResolvedValue(false);
    await expect(getTelemetryHistory({ actor: SCOPED, deviceId: 'NOT-MINE' })).rejects.toMatchObject({
      status: 403,
    });
    expect(findMany).not.toHaveBeenCalled();
  });

  it('scopes assigned telemetry records inside the SQL and binds actor ID', async () => {
    vi.mocked(findMany).mockResolvedValue([]);
    await getTelemetryHistory({
      actor: SCOPED,
      deviceId: 'TRACKER_001',
      from: '2026-01-01',
      to: '2026-01-02',
    });
    const [sql, params] = vi.mocked(findMany).mock.calls[0];
    expect(sql).toContain('user_device_access');
    expect(sql).toContain('uda.user_id = $4');
    expect(sql).toContain('uda.device_id = event_logs.device_id');
    expect(params).toEqual([
      'TRACKER_001', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z', 22,
    ]);
  });

  it('keeps full-fleet history available to root/admin without a user-grant filter', async () => {
    vi.mocked(findMany).mockResolvedValue([]);
    await getTelemetryHistory({ actor: ADMIN, deviceId: 'TRACKER_001' });
    const [sql, params] = vi.mocked(findMany).mock.calls[0];
    expect(sql).not.toContain('user_device_access');
    expect(params).toHaveLength(3);
  });

  it('rejects invalid and inverted telemetry date windows before querying', async () => {
    await expect(getTelemetryHistory({
      actor: ADMIN, deviceId: 'TRACKER_001', from: 'not-a-date',
    })).rejects.toMatchObject({ status: 400 });
    await expect(getTelemetryHistory({
      actor: ADMIN, deviceId: 'TRACKER_001', from: '2026-01-03', to: '2026-01-01',
    })).rejects.toMatchObject({ status: 400 });
    expect(findMany).not.toHaveBeenCalled();
  });
});
