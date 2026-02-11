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

const getUserReadState = (userId: number): Set<number> => {
  const existing = readStateByUser.get(userId);
  if (existing) return existing;
  const created = new Set<number>();
  readStateByUser.set(userId, created);
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
  const { where, values } = buildWhereClause({
    type: params.type,
    search: params.search,
    from: params.from,
    to: params.to,
  });

  const countRows = await findMany<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM alerts ${where}`,
    values,
  );
  const total = Number.parseInt(countRows[0]?.total ?? '0', 10);

  const mapRowToItem = (row: AlertNotificationRow): NotificationItem => ({
    id: row.id,
    type: toNotificationType(row.alert_type),
    title: row.title,
    message: row.message ?? '',
    isRead: readState.has(row.id),
    referenceId: row.id,
    referenceType: 'alert',
    createdAt: row.created_at.toISOString(),
  });

  let items: NotificationItem[] = [];
  let effectiveTotal = total;

  if (params.isRead === undefined) {
    const rows = await findMany<AlertNotificationRow>(
      `SELECT id, alert_type, title, message, created_at
       FROM alerts ${where}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset],
    );
    items = rows.map(mapRowToItem);
  } else {
    const rows = await findMany<AlertNotificationRow>(
      `SELECT id, alert_type, title, message, created_at
       FROM alerts ${where}
       ORDER BY created_at DESC`,
      values,
    );
    const filtered = rows.map(mapRowToItem).filter((item) => item.isRead === params.isRead);
    effectiveTotal = filtered.length;
    items = filtered.slice(offset, offset + limit);
  }

  const ids = await findMany<{ id: number }>(`SELECT id FROM alerts ${where}`, values);
  const unreadCount = ids.reduce((count, row) => (readState.has(row.id) ? count : count + 1), 0);

  return {
    items,
    unreadCount,
    total: effectiveTotal,
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
  // Soft delete behavior for notification center: treat as read and hidden by id.
  getUserReadState(userId).add(id);
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

  const byType: Record<NotificationType, number> = {
    alert: 0,
    system: 0,
    export: 0,
    firmware: 0,
    geofence: 0,
  };

  let unreadCount = 0;
  for (const row of rows) {
    const type = toNotificationType(row.alert_type);
    byType[type] += 1;
    if (!readState.has(row.id)) {
      unreadCount += 1;
    }
  }

  return {
    total: rows.length,
    unreadCount,
    byType,
  };
};
