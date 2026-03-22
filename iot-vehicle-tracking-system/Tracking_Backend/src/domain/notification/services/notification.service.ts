import { findMany } from '@/infrastructure/database/queries';

interface AlertNotificationRow {
  id: number;
  alert_type: string;
  title: string;
  message: string | null;
  created_at: Date;
}

type NotificationType = 'alert' | 'system' | 'export' | 'firmware' | 'geofence';

interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  referenceId: number | null;
  referenceType: string | null;
  createdAt: string;
}

const readStateByUser = new Map<number, Set<number>>();
const hiddenStateByUser = new Map<number, Set<number>>();

const getUserReadState = (userId: number): Set<number> => {
  const existing = readStateByUser.get(userId);
  if (existing) return existing;
  const created = new Set<number>();
  readStateByUser.set(userId, created);
  return created;
};

const getUserHiddenState = (userId: number): Set<number> => {
  const existing = hiddenStateByUser.get(userId);
  if (existing) return existing;
  const created = new Set<number>();
  hiddenStateByUser.set(userId, created);
  return created;
};

const toNotificationType = (alertType: string): NotificationType => {
  const normalized = alertType.toLowerCase();
  if (normalized.includes('geofence')) return 'geofence';
  if (normalized.includes('firmware')) return 'firmware';
  if (normalized.includes('export')) return 'export';
  if (
    normalized.includes('system') ||
    normalized.includes('offline') ||
    normalized.includes('database') ||
    normalized.includes('service')
  ) {
    return 'system';
  }
  return 'alert';
};

const buildWhereClause = (params: {
  type?: NotificationType;
  search?: string;
  from?: string;
  to?: string;
}): { where: string; values: unknown[] } => {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let index = 1;

  if (params.type && params.type !== 'alert') {
    if (params.type === 'geofence') {
      conditions.push(`alert_type ILIKE $${index++}`);
      values.push('%geofence%');
    } else if (params.type === 'firmware') {
      conditions.push(`alert_type ILIKE $${index++}`);
      values.push('%firmware%');
    } else if (params.type === 'export') {
      conditions.push(`alert_type ILIKE $${index++}`);
      values.push('%export%');
    } else if (params.type === 'system') {
      conditions.push(
        `(alert_type ILIKE $${index} OR alert_type ILIKE $${index + 1} OR alert_type ILIKE $${index + 2} OR alert_type ILIKE $${index + 3})`,
      );
      values.push('%system%', '%offline%', '%database%', '%service%');
      index += 4;
    }
  } else if (params.type === 'alert') {
    conditions.push(
      `(alert_type NOT ILIKE $${index} AND alert_type NOT ILIKE $${index + 1} AND alert_type NOT ILIKE $${index + 2} AND alert_type NOT ILIKE $${index + 3})`,
    );
    values.push('%geofence%', '%firmware%', '%export%', '%system%');
    index += 4;
  }

  if (params.search && params.search.trim().length > 0) {
    conditions.push(`(title ILIKE $${index} OR COALESCE(message, '') ILIKE $${index})`);
    values.push(`%${params.search.trim()}%`);
    index += 1;
  }

  if (params.from) {
    conditions.push(`created_at >= $${index++}`);
    values.push(params.from);
  }

  if (params.to) {
    conditions.push(`created_at <= $${index++}`);
    values.push(params.to);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
};

export const listNotifications = async (
  userId: number,
  params: {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: NotificationType;
    search?: string;
    from?: string;
    to?: string;
  },
): Promise<{
  items: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
}> => {
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;
  const readState = getUserReadState(userId);
  const hiddenState = getUserHiddenState(userId);
  const { where, values } = buildWhereClause({
    type: params.type,
    search: params.search,
    from: params.from,
    to: params.to,
  });

  const rows = await findMany<AlertNotificationRow>(
    `SELECT id, alert_type, title, message, created_at
     FROM alerts ${where}
     ORDER BY created_at DESC`,
    values,
  );

  const items = rows
    .map<NotificationItem>((row) => ({
      id: row.id,
      type: toNotificationType(row.alert_type),
      title: row.title,
      message: row.message ?? '',
      isRead: readState.has(row.id),
      referenceId: row.id,
      referenceType: 'alert',
      createdAt: row.created_at.toISOString(),
    }))
    .filter((item) => !hiddenState.has(item.id))
    .filter((item) => (params.isRead === undefined ? true : item.isRead === params.isRead));

  const unreadCount = items.reduce((count, item) => (item.isRead ? count : count + 1), 0);

  return {
    items: items.slice(offset, offset + limit),
    unreadCount,
    total: items.length,
    page,
    limit,
  };
};

export const markRead = async (userId: number, id: number): Promise<void> => {
  getUserReadState(userId).add(id);
};

export const markAllRead = async (userId: number): Promise<void> => {
  const rows = await findMany<{ id: number }>('SELECT id FROM alerts');
  const next = getUserReadState(userId);
  for (const row of rows) {
    next.add(row.id);
  }
};

export const deleteNotification = async (userId: number, id: number): Promise<void> => {
  getUserReadState(userId).add(id);
  getUserHiddenState(userId).add(id);
};

export const getNotificationStats = async (
  userId: number,
): Promise<{
  total: number;
  unreadCount: number;
  byType: Record<NotificationType, number>;
}> => {
  const rows = await findMany<Pick<AlertNotificationRow, 'id' | 'alert_type'>>(
    'SELECT id, alert_type FROM alerts',
  );
  const readState = getUserReadState(userId);
  const hiddenState = getUserHiddenState(userId);

  const byType: Record<NotificationType, number> = {
    alert: 0,
    system: 0,
    export: 0,
    firmware: 0,
    geofence: 0,
  };

  let unreadCount = 0;
  for (const row of rows) {
    if (hiddenState.has(row.id)) {
      continue;
    }
    const type = toNotificationType(row.alert_type);
    byType[type] += 1;
    if (!readState.has(row.id)) {
      unreadCount += 1;
    }
  }

  return {
    total: Object.values(byType).reduce((sum, count) => sum + count, 0),
    unreadCount,
    byType,
  };
};
