import { describe, expect, it, vi } from 'vitest';
import type { VehicleAccessScope } from './vehicle.repository';

vi.mock('@/infrastructure/database/queries', () => ({
  findOne: vi.fn(), findMany: vi.fn(), insertOne: vi.fn(),
  updateOne: vi.fn(), deleteOne: vi.fn(),
}));
vi.mock('@/infrastructure/database/pool', () => ({ pool: { query: vi.fn() } }));

import { updateOne, findOne } from '@/infrastructure/database/queries';
import { update } from './vehicle.repository';

const operator: VehicleAccessScope = {
  userId: 42, role: 'operator', deviceAccessMode: 'assigned',
};
const admin: VehicleAccessScope = { userId: 1, role: 'admin', deviceAccessMode: 'all' };

describe('vehicle write grant is checked in the mutation statement', () => {
  it('uses the live device assignment when an operator updates a vehicle', async () => {
    vi.mocked(updateOne).mockResolvedValueOnce(null);
    await update(19, { notes: 'approved note' }, operator);
    const [sql, params] = vi.mocked(updateOne).mock.calls.at(-1)!;
    expect(sql).toContain('UPDATE vehicles AS v');
    expect(sql).toContain('EXISTS (');
    expect(sql).toContain('FROM user_device_access uda');
    expect(sql).toContain('uda.device_id = v.device_id');
    expect(params).toEqual(['approved note', 19, 42]);
  });

  it('does not require an assignment for administrators', async () => {
    vi.mocked(updateOne).mockResolvedValueOnce(null);
    await update(19, { notes: 'admin note' }, admin);
    const [sql, params] = vi.mocked(updateOne).mock.calls.at(-1)!;
    expect(sql).toContain('WHERE v.id = $2 AND TRUE');
    expect(params).toEqual(['admin note', 19]);
  });

  it('uses a scoped read even when no update fields are present', async () => {
    vi.mocked(findOne).mockResolvedValueOnce(null);
    const result = await update(19, {}, operator);
    expect(result).toBeNull();
    const [sql, params] = vi.mocked(findOne).mock.calls.at(-1)!;
    expect(sql).toContain('user_device_access uda');
    expect(params).toEqual([19, 42]);
  });
});
