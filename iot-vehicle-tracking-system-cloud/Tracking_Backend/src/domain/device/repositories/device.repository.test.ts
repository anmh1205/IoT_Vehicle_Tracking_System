vi.mock('@/infrastructure/database/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('@/infrastructure/database/queries', () => ({
  findOne: vi.fn(),
  findMany: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
  deleteOne: vi.fn(),
}));

import { pool } from '@/infrastructure/database/pool';
import { findMany } from '@/infrastructure/database/queries';
import {
  findAll,
  findAllPositions,
  hasAssignedAccessByDeviceId,
  hasAssignedAccessByReference,
} from './device.repository';

describe('device.repository access scope', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('checks an assigned device by canonical device id', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rowCount: 1, rows: [{ '?column?': 1 }] } as any);

    await expect(hasAssignedAccessByDeviceId(7, 'DEVICE_001')).resolves.toBe(true);

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('FROM user_device_access');
    expect(sql).toContain('device_id = $2');
    expect(params).toEqual([7, 'DEVICE_001']);
  });

  it('checks assigned access for numeric and canonical route references', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rowCount: 0, rows: [] } as any);

    await expect(hasAssignedAccessByReference(7, '42')).resolves.toBe(false);
    let [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('d.id = $2');
    expect(params).toEqual([7, 42]);

    vi.mocked(pool.query).mockClear();
    await expect(hasAssignedAccessByReference(7, 'DEVICE_001')).resolves.toBe(false);
    [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('d.device_id = $2');
    expect(params).toEqual([7, 'DEVICE_001']);
  });

  it('filters device list by user_device_access for assigned non-admin users', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ total: '0' }] } as any);
    vi.mocked(findMany).mockResolvedValue([]);

    await findAll(
      { page: 1, limit: 20 },
      { userId: 7, role: 'viewer', deviceAccessMode: 'assigned' },
    );

    const [countSql, countParams] = vi.mocked(pool.query).mock.calls[0] ?? [];
    const [listSql, listParams] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(countSql).toContain('FROM user_device_access uda');
    expect(countParams).toEqual([7]);
    expect(listSql).toContain('FROM user_device_access uda');
    expect(listParams).toEqual([7, 20, 0]);
  });

  it('does not add user_device_access filter for global access users', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ total: '0' }] } as any);
    vi.mocked(findMany).mockResolvedValue([]);

    await findAll(
      { page: 1, limit: 20 },
      { userId: 1, role: 'admin', deviceAccessMode: 'assigned' },
    );

    const [countSql, countParams] = vi.mocked(pool.query).mock.calls[0] ?? [];
    const [listSql, listParams] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(countSql).not.toContain('FROM user_device_access uda');
    expect(countParams).toEqual([]);
    expect(listSql).not.toContain('FROM user_device_access uda');
    expect(listParams).toEqual([20, 0]);
  });

  it('filters map positions by user_device_access for assigned non-admin users', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await findAllPositions({ userId: 7, role: 'viewer', deviceAccessMode: 'assigned' });

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];

    expect(sql).toContain('FROM user_device_access uda');
    expect(sql).toContain('COALESCE(d.last_latitude, d.latitude) IS NOT NULL');
    expect(sql).toContain("raw_payload,data,device_battery");
    expect(sql).toContain("raw_payload,diagnostics,signals,rpm");
    expect(params).toEqual([7]);
  });
});
