import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '@/shared/types/common.types';

vi.mock('@/infrastructure/database/pool', () => ({
  pool: { query: vi.fn() },
}));

import { pool } from '@/infrastructure/database/pool';
import * as repo from '../violation.repository';

const assigned: SessionUser = {
  id: 73, username: 'scoped', role: 'operator', deviceAccessMode: 'assigned',
};
const root: SessionUser = {
  id: 1, username: 'root', role: 'root', deviceAccessMode: 'all',
};

const query = vi.mocked(pool.query);

const dbRows = (rows: unknown[]) =>
  ({ rows, rowCount: rows.length, command: 'SELECT', oid: 0, fields: [] }) as never;

describe('violation SQL authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('applies the assigned vehicle grant to count and list with bound actor ID', async () => {
    query.mockResolvedValueOnce(dbRows([{ total: '0' }]));
    query.mockResolvedValueOnce(dbRows([]));
    await repo.findAll({ page: 1, limit: 20, acknowledged: false }, assigned);
    expect(query).toHaveBeenCalledTimes(2);
    for (const [sql, params] of query.mock.calls) {
      expect(String(sql)).toContain('user_device_access');
      expect(String(sql)).toContain('uda.user_id = $2');
      expect(params).toContain(73);
      expect(String(sql)).toContain('acknowledged = $1');
    }
  });

  it('allows root fleet-wide listing but keeps filtering parametrized', async () => {
    query.mockResolvedValueOnce(dbRows([{ total: '0' }]));
    query.mockResolvedValueOnce(dbRows([]));
    await repo.findAll({ page: 1, limit: 10 }, root);
    expect(String(query.mock.calls[0][0])).not.toContain('user_device_access');
  });

  it('enforces grants in the same SQL statement that inserts violations', async () => {
    query.mockResolvedValueOnce(dbRows([]));
    const result = await repo.create({ vehicleId: 'VH-NOT-OWNED', violationType: 'speeding' }, assigned);
    expect(result).toBeNull();
    expect(String(query.mock.calls[0][0])).toContain('WHERE EXISTS');
    expect(String(query.mock.calls[0][0])).toContain('uda.user_id = $15');
    expect(query.mock.calls[0][1]).toContain(73);
  });

  it('checks assigned access on incident detail', async () => {
    query.mockResolvedValueOnce(dbRows([]));
    expect(await repo.findById(99, assigned)).toBeNull();
    expect(String(query.mock.calls[0][0])).toContain('uda.user_id = $2');
    expect(query.mock.calls[0][1]).toEqual([99, 73]);
  });

  it('acknowledges once with actor-specific WHERE clause', async () => {
    query.mockResolvedValueOnce(dbRows([]));
    expect(await repo.acknowledge(7, assigned, { notes: 'ok' })).toBeNull();
    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain('acknowledged = FALSE');
    expect(sql).toContain('uda.user_id = $4');
    expect(query.mock.calls[0][1]).toEqual([73, 'ok', 7, 73]);
  });
});
