vi.mock('@/infrastructure/database/queries', () => ({
  executeQuery: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
}));

import { executeQuery, findMany, findOne } from '@/infrastructure/database/queries';
import {
  findNotificationPage,
  getNotificationCounts,
  getNotificationStats,
  markNotificationRead,
  markAllNotificationsRead,
  hideNotification,
} from './notification.repository';

const globalScope = { userId: 7, role: 'admin', deviceAccessMode: 'all' };
const assignedScope = { userId: 7, role: 'viewer', deviceAccessMode: 'assigned' };

describe('notification.repository', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(findMany).mockResolvedValue([]);
    vi.mocked(findOne).mockResolvedValue(null);
  });

  it('casts alert_type before matching notification categories and paginates in SQL', async () => {
    await findNotificationPage({ ...globalScope, userId: 1 }, { type: 'zone' }, 20, 0);

    const [sql, params] = vi.mocked(findMany).mock.calls[0] ?? [];

    expect(sql).toContain('a.alert_type::text ILIKE $2');
    expect(sql).toContain('a.alert_type::text ILIKE $3');
    expect(sql).toContain('LIMIT $4');
    expect(sql).toContain('OFFSET $5');
    expect(params).toEqual([1, '%zone%', '%geofence%', 20, 0]);
  });

  it('keeps alert category placeholders aligned with pagination values', async () => {
    await findNotificationPage({ ...globalScope, userId: 1 }, { type: 'alert' }, 25, 50);

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
    await findNotificationPage(globalScope, { isRead: false }, 10, 20);

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
      getNotificationCounts(globalScope, { type: 'system', isRead: false }),
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

    await expect(getNotificationStats(globalScope)).resolves.toEqual({
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
  it('restricts assigned users to alerts from currently granted devices', async () => {
    await findNotificationPage(assignedScope, {}, 10, 0);
    const [query, args] = vi.mocked(findMany).mock.calls[0] ?? [];
    expect(query).toContain('EXISTS (');
    expect(query).toContain('user_device_access uda');
    expect(query).toContain('uda.user_id = $1');
    expect(query).toContain('uda.device_id = a.device_id');
    expect(query).toContain('a.device_id IS NULL AND a.vehicle_id IS NOT NULL');
    expect(args).toEqual([7, 10, 0]);

    await getNotificationCounts(assignedScope, {});
    const [countQuery, countArgs] = vi.mocked(findOne).mock.calls[0] ?? [];
    expect(countQuery).toContain('user_device_access uda');
    expect(countArgs).toEqual([7]);
  });

  it('applies the access predicate to stats, read, hide and mark-all', async () => {
    await getNotificationStats(assignedScope);
    expect(vi.mocked(findOne).mock.calls[0]?.[0]).toContain('user_device_access uda');

    await markNotificationRead(assignedScope, 99);
    await hideNotification(assignedScope, 99);
    await markAllNotificationsRead(assignedScope);
    const mutations = vi.mocked(executeQuery).mock.calls;
    expect(mutations).toHaveLength(3);
    for (const [sql] of mutations) {
      expect(sql).toContain('user_device_access uda');
      expect(sql).toContain('FROM alerts a');
    }
    expect(mutations[0]?.[1]).toEqual([7, 99]);
    expect(mutations[1]?.[1]).toEqual([7, 99]);
    expect(mutations[2]?.[1]).toEqual([7]);
  });

  it('preserves global account access without joining assignment table', async () => {
    await findNotificationPage(globalScope, {}, 10, 0);
    expect(vi.mocked(findMany).mock.calls[0]?.[0]).not.toContain('user_device_access uda');
  });

});
