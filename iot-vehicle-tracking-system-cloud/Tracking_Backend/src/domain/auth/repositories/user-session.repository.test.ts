vi.mock('@/infrastructure/database/queries', () => ({
  findOne: vi.fn(),
  insertOne: vi.fn(),
  executeQuery: vi.fn(),
}));

import { executeQuery } from '@/infrastructure/database/queries';
import { extendSession } from './user-session.repository';

describe('user-session.repository extendSession', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('extends within the absolute lifetime without shortening a later expiry', async () => {
    vi.mocked(executeQuery).mockResolvedValue(1);

    const result = await extendSession(42, 4, 24);

    expect(result).toBe(true);
    const [sql, params] = vi.mocked(executeQuery).mock.calls[0] ?? [];
    expect(sql).toContain('LEAST(');
    expect(sql).toContain("login_at + INTERVAL '1 hour' * $2");
    expect(sql).toContain('GREATEST(expires_at');
    expect(sql).toContain("NOW() + INTERVAL '1 hour' * $1");
    expect(sql).toContain('WHERE id = $3');
    expect(params).toEqual([4, 24, 42]);
  });
});
