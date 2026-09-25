vi.mock('@/infrastructure/database/queries', () => ({
  executeQuery: vi.fn(),
}));

import { executeQuery } from '@/infrastructure/database/queries';
import { registerPushToken, unregisterPushToken } from './push-token.repository';

describe('push-token.repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('retires prior ownership and refreshes an existing token record', async () => {
    vi.mocked(executeQuery)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    await registerPushToken(7, 'token-abcdefghijklmnopqrstuvwxyz', {
      platform: 'android',
      appVersion: '1.0.0',
    });

    expect(executeQuery).toHaveBeenCalledTimes(2);

    const [retireSql, retireParams] = vi.mocked(executeQuery).mock.calls[0] ?? [];
    expect(retireSql).toContain('user_id <> $2');
    expect(retireParams).toEqual(['token-abcdefghijklmnopqrstuvwxyz', 7]);

    const [refreshSql, refreshParams] = vi.mocked(executeQuery).mock.calls[1] ?? [];
    expect(refreshSql).toContain('device_info = $3::jsonb');
    expect(refreshSql).toContain('deleted_at = NULL');
    expect(refreshParams).toEqual([
      7,
      'token-abcdefghijklmnopqrstuvwxyz',
      JSON.stringify({ platform: 'android', appVersion: '1.0.0' }),
    ]);
  });

  it('inserts a token when the user has no prior record', async () => {
    vi.mocked(executeQuery)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);

    await registerPushToken(7, 'token-abcdefghijklmnopqrstuvwxyz');

    expect(executeQuery).toHaveBeenCalledTimes(3);
    const [insertSql, insertParams] = vi.mocked(executeQuery).mock.calls[2] ?? [];
    expect(insertSql).toContain('INSERT INTO fcm_tokens');
    expect(insertParams).toEqual([
      7,
      'token-abcdefghijklmnopqrstuvwxyz',
      JSON.stringify({}),
    ]);
  });

  it('soft-deletes only the current user token on unregister', async () => {
    vi.mocked(executeQuery).mockResolvedValueOnce(1);

    await expect(
      unregisterPushToken(7, 'token-abcdefghijklmnopqrstuvwxyz'),
    ).resolves.toBe(true);

    const [sql, params] = vi.mocked(executeQuery).mock.calls[0] ?? [];
    expect(sql).toContain('user_id = $1 AND token = $2');
    expect(sql).toContain('deleted_at IS NULL');
    expect(params).toEqual([7, 'token-abcdefghijklmnopqrstuvwxyz']);
  });
});
