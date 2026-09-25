vi.mock('@/infrastructure/database/queries', () => ({
  executeQuery: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
}));

import { findMany, findOne } from '@/infrastructure/database/queries';
import {
  findNotificationPage,
  getNotificationCounts,
  getNotificationStats,
} from './notification.repository';

describe('notification.repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(findMany).mockResolvedValue([]);
    vi.mocked(findOne).mockResolvedValue(null);
  });

  it('casts alert_type before matching notification categories and paginates in SQL', async () => {
    await findNotificationPage(1, { type: 'zone' }, 20, 0);

    const [sql, params] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain('a.alert_type::text ILIKE $2');
    expect(sql).toContain('a.alert_type::text ILIKE $3');
    expect(sql).toContain('LIMIT $4');
    expect(sql).toContain('OFFSET $5');
    expect(params).toEqual([1, '%zone%', '%geofence%', 20, 0]);
  });

  it('keeps alert category placeholders aligned with pagination values', async () => {
    await findNotificationPage(1, { type: 'alert' }, 25, 50);

    const [sql, params] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain('a.alert_type::text NOT ILIKE $2');
    expect(sql).toContain('a.alert_type::text NOT ILIKE $9');
    expect(sql).toContain('LIMIT $10');
    expect(sql).toContain('OFFSET $11');
    expect(params).toEqual([
      1,
      '%zone%',
      '%geofence%',
      '%firmware%',
      '%export%',
      '%system%',
      '%offline%',
      '%database%',
      '%service%',
      25,
      50,
    ]);
  });

  it('pushes read filtering before limit and offset', async () => {
    await findNotificationPage(7, { isRead: false }, 10, 20);

    const [sql, params] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain('COALESCE(state.is_read, FALSE) = $2');
    expect(sql).toContain('LIMIT $3');
    expect(sql).toContain('OFFSET $4');
    expect(params).toEqual([7, false, 10, 20]);
  });

  it('counts filtered notifications without returning all rows', async () => {
    vi.mocked(findOne).mockResolvedValue({
      total_count: 42,
      unread_count: 12,
    } as any);

    await expect(
      getNotificationCounts(7, { type: 'system', isRead: false }),
    ).resolves.toEqual({ total: 42, unreadCount: 12 });

    const [sql, params] = vi.mocked(findOne).mock.calls[0] ?? [];
    expect(sql).toContain('COUNT(*)::int AS total_count');
    expect(sql).toContain("a.alert_type::text ILIKE $2");
    expect(sql).toContain('COALESCE(state.is_read, FALSE) = $6');
    expect(sql).not.toContain('LIMIT');
    expect(params).toEqual([
      7,
      '%system%',
      '%offline%',
      '%database%',
      '%service%',
      false,
    ]);
  });

  it('aggregates stats without device or vehicle presentation joins', async () => {
    vi.mocked(findOne).mockResolvedValue({
      total_count: 10,
      unread_count: 3,
      alert_count: 4,
      system_count: 2,
      export_count: 1,
      firmware_count: 1,
      zone_count: 2,
    } as any);

    await expect(getNotificationStats(7)).resolves.toEqual({
      total: 10,
      unreadCount: 3,
      byType: {
        alert: 4,
        system: 2,
        export: 1,
        firmware: 1,
        zone: 2,
      },
    });

    const [sql, params] = vi.mocked(findOne).mock.calls[0] ?? [];
    expect(sql).toContain("notification_type = 'system'");
    expect(sql).toContain("ILIKE '%offline%'");
    expect(sql).not.toContain('JOIN devices');
    expect(sql).not.toContain('JOIN vehicles');
    expect(params).toEqual([7]);
  });
});
