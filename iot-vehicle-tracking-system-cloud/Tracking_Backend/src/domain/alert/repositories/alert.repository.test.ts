vi.mock('@/infrastructure/database/pool', () => ({
  pool: {
    query: vi.fn(),
    connect: vi.fn(),
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
import { create, findAll } from './alert.repository';

describe('alert.repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('casts alert_type before using ILIKE in search filters', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ total: '0' }] } as any);
    vi.mocked(findMany).mockResolvedValue([]);

    await findAll({ search: 'brake' });

    const [countSql, countParams] = vi.mocked(pool.query).mock.calls[0] ?? [];
    const [listSql, listParams] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(countSql).toContain('a.alert_type::text ILIKE $1');
    expect(listSql).toContain('a.alert_type::text ILIKE $1');
    expect(countParams).toEqual(['%brake%']);
    expect(listParams).toEqual(['%brake%', 20, 0]);
  });

  it('scopes virtual OBD source to ECU-backed maintenance alerts without generic maintenance text', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ total: '0' }] } as any);
    vi.mocked(findMany).mockResolvedValue([]);

    await findAll({ source: 'obd' });

    const [countSql, countParams] = vi.mocked(pool.query).mock.calls[0] ?? [];
    const [listSql, listParams] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(countSql).toContain("a.source::text = 'ecu'");
    expect(listSql).toContain("a.source::text = 'ecu'");
    expect(countSql).toContain('CONCAT_WS');
    expect(listSql).toContain('CONCAT_WS');
    expect(countSql).not.toContain("ILIKE '%mil%'");
    expect(listSql).not.toContain("ILIKE '%mil%'");
    expect(countSql).not.toContain("ILIKE '%maintenance%'");
    expect(listSql).not.toContain("ILIKE '%maintenance%'");
    expect(countParams).toEqual([]);
    expect(listParams).toEqual([20, 0]);
  });

  it('excludes OBD-derived maintenance alerts from virtual system source', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [{ total: '0' }] } as any);
    vi.mocked(findMany).mockResolvedValue([]);

    await findAll({ source: 'system' });

    const [countSql] = vi.mocked(pool.query).mock.calls[0] ?? [];
    const [listSql] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(countSql).toContain('NOT (a.alert_type =');
    expect(listSql).toContain('NOT (a.alert_type =');
    expect(countSql).not.toContain("ILIKE '%maintenance%'");
    expect(listSql).not.toContain("ILIKE '%maintenance%'");
  });
});


  it('returns the existing alert when source message identity is delivered twice', async () => {
    const release = vi.fn();
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // duplicate insert
      .mockResolvedValueOnce({
        rows: [{
          id: 41,
          device_id: 'TRACKER_001',
          alert_type: 'maintenance_due',
          source_message_id: 'boot-1-event-9',
        }],
        rowCount: 1,
      })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    vi.mocked(pool.connect).mockResolvedValue({ query, release } as any);

    const result = await create({
      deviceId: 'TRACKER_001',
      alertType: 'maintenance_due',
      severity: 'medium',
      title: 'Device warning',
      sourceMessageId: 'boot-1-event-9',
    });

    expect(result.created).toBe(false);
    expect(result.alert.id).toBe(41);
    expect(query.mock.calls[1]?.[0]).toContain('ON CONFLICT (source_message_id)');
    expect(query.mock.calls[2]?.[0]).toContain('WHERE source_message_id = $1');
    expect(query.mock.calls[2]?.[1]).toEqual(['boot-1-event-9']);
    expect(release).toHaveBeenCalledOnce();
  });
