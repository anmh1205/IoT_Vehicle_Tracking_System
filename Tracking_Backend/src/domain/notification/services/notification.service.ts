import { findMany } from '@/infrastructure/database/queries';

interface AlertNotificationRow {
  id: number;
  alert_type: string;
  title: string;
  message: string | null;
  created_at: Date;
}

interface NotificationItem {
  id: number;
  type: 'alert' | 'system' | 'export' | 'firmware' | 'geofence';
  title: string;
  message: string;
  isRead: boolean;
  referenceId: number | null;
  referenceType: string | null;
  createdAt: string;
}

const readStateByUser = new Map<number, Set<number>>();

const getUserReadState = (userId: number): Set<number> => {
  const existing = readStateByUser.get(userId);
  if (existing) return existing;
  const created = new Set<number>();
  readStateByUser.set(userId, created);
  return created;
};

export const listNotifications = async (
  userId: number,
  params: { page?: number; limit?: number; isRead?: boolean },
): Promise<{ items: NotificationItem[]; unreadCount: number; total: number }> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  const rows = await findMany<AlertNotificationRow>(
    `SELECT id, alert_type, title, message, created_at
     FROM alerts
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset],
  );

  const readState = getUserReadState(userId);
  const items: NotificationItem[] = rows.map((row) => ({
    id: row.id,
    type: row.alert_type.includes('geofence') ? 'geofence' : 'alert',
    title: row.title,
    message: row.message ?? '',
    isRead: readState.has(row.id),
    referenceId: row.id,
    referenceType: 'alert',
    createdAt: row.created_at.toISOString(),
  }));

  const filtered = params.isRead === undefined
    ? items
    : items.filter((item) => item.isRead === params.isRead);

  return {
    items: filtered,
    unreadCount: items.filter((item) => !item.isRead).length,
    total: filtered.length,
  };
};

export const markRead = async (userId: number, id: number): Promise<void> => {
  getUserReadState(userId).add(id);
};

export const markAllRead = async (userId: number): Promise<void> => {
  const rows = await findMany<{ id: number }>('SELECT id FROM alerts ORDER BY created_at DESC LIMIT 500');
  const next = getUserReadState(userId);
  for (const row of rows) {
    next.add(row.id);
  }
};

export const deleteNotification = async (userId: number, id: number): Promise<void> => {
  // Soft delete behavior for notification center: treat as read and hidden by id.
  getUserReadState(userId).add(id);
};
