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
  createDeployments,
  markDeploymentCommandDispatched,
} from './firmware.repository';

describe('firmware.repository deployment lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('creates assigned deployment before command dispatch timestamp exists', async () => {
    vi.mocked(findMany).mockResolvedValue([] as never);

    await createDeployments(7, ['TRACKER_001'], '1.2.3', 180);

    const [sql, params] = vi.mocked(findMany).mock.calls[0] ?? [];
    expect(sql).toContain('command_dispatched_at');
    expect(sql).toMatch(
      /'assigned',\s*0,\s*\$4,\s*NOW\(\),\s*NULL,\s*NOW\(\),\s*\$5/,
    );
    expect(params).toHaveLength(5);
    expect(params?.[1]).toBe('TRACKER_001');
    expect(params?.[2]).toBe(7);
    expect(params?.[3]).toBe('1.2.3');
    expect(params?.[4]).toBe(180);
  });

  it('marks dispatch time only after command publish succeeds', async () => {
    vi.mocked(pool.query).mockResolvedValue({ rows: [] } as any);

    await markDeploymentCommandDispatched(91);

    const [sql, params] = vi.mocked(pool.query).mock.calls[0] ?? [];
    expect(sql).toContain('command_dispatched_at = COALESCE(command_dispatched_at, NOW())');
    expect(params).toEqual([91]);
  });
});
