vi.mock('@/infrastructure/database/queries', () => ({
  executeQuery: vi.fn(),
  findMany: vi.fn(),
}));

import { findMany } from '@/infrastructure/database/queries';
import { findNotificationRows } from './notification.repository';

describe('notification.repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(findMany).mockResolvedValue([]);
  });

  it('casts alert_type before matching notification categories', async () => {
    await findNotificationRows(1, { type: 'zone' });

    const [sql, params] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain('a.alert_type::text ILIKE $2');
    expect(sql).toContain('a.alert_type::text ILIKE $3');
    expect(params).toEqual([1, '%zone%', '%geofence%']);
  });

  it('keeps alert category placeholders aligned with values', async () => {
    await findNotificationRows(1, { type: 'alert' });

    const [sql, params] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain('a.alert_type::text NOT ILIKE $2');
    expect(sql).toContain('a.alert_type::text NOT ILIKE $6');
    expect(params).toEqual([1, '%zone%', '%geofence%', '%firmware%', '%export%', '%system%']);
  });
});
