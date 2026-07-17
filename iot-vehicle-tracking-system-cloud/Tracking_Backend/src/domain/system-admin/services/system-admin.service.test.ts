vi.mock('@/infrastructure/database/pool', () => ({
  pool: {
    query: vi.fn(),
  },
}));

vi.mock('@/infrastructure/realtime', () => ({
  publishEvent: vi.fn(),
}));

import { pool } from '@/infrastructure/database/pool';
import { getTableColumns, queryTable } from './system-admin.service';

const tableColumns = [
  { column_name: 'id', data_type: 'integer', is_nullable: 'NO', ordinal_position: 1 },
  { column_name: 'device_id', data_type: 'character varying', is_nullable: 'NO', ordinal_position: 2 },
  { column_name: 'auth_token', data_type: 'character varying', is_nullable: 'NO', ordinal_position: 3 },
  { column_name: 'created_at', data_type: 'timestamp with time zone', is_nullable: 'YES', ordinal_position: 4 },
];

const userColumns = [
  { column_name: 'id', data_type: 'integer', is_nullable: 'NO', ordinal_position: 1 },
  { column_name: 'email', data_type: 'character varying', is_nullable: 'NO', ordinal_position: 2 },
  { column_name: 'password_hash', data_type: 'character varying', is_nullable: 'NO', ordinal_position: 3 },
  { column_name: 'session_token', data_type: 'character varying', is_nullable: 'YES', ordinal_position: 4 },
];

describe('system-admin table browser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('hides sensitive columns from metadata', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: tableColumns } as any);

    const columns = await getTableColumns('devices');

    expect(columns.map((column) => column.name)).toEqual(['id', 'device_id', 'created_at']);
  });

  it('hides user credential and session columns from metadata', async () => {
    vi.mocked(pool.query).mockResolvedValueOnce({ rows: userColumns } as any);

    const columns = await getTableColumns('users');

    expect(columns.map((column) => column.name)).toEqual(['id', 'email']);
  });

  it('does not select or search sensitive columns', async () => {
    vi.mocked(pool.query)
      .mockResolvedValueOnce({ rows: tableColumns } as any)
      .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
      .mockResolvedValueOnce({
        rows: [{ id: 1, device_id: 'DEV-001', created_at: '2026-05-04T00:00:00.000Z' }],
      } as any);

    const result = await queryTable('devices', { search: 'DEV' });

    const [countSql] = vi.mocked(pool.query).mock.calls[1] ?? [];
    const [rowsSql] = vi.mocked(pool.query).mock.calls[2] ?? [];

    expect(String(countSql)).not.toContain('auth_token');
    expect(String(countSql)).not.toContain('CAST(t AS text)');
    expect(String(rowsSql)).toContain('SELECT t."id", t."device_id", t."created_at"');
    expect(String(rowsSql)).not.toContain('auth_token');
    expect(result.items[0]).not.toHaveProperty('auth_token');
  });
});
