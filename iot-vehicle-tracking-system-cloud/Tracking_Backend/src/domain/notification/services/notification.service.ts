import type { NotificationType } from '@/domain/notification/repositories/notification.repository';
import {
  findNotificationRows,
  hideNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/domain/notification/repositories/notification.repository';

interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  referenceId: number | null;
  referenceType: string | null;
  vehicleId: string | null;
  vehiclePlateNumber: string | null;
  deviceId: string | null;
  deviceName: string | null;
  contextLabel: string | null;
  createdAt: string;
}

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

const buildNotificationItem = (row: Awaited<ReturnType<typeof findNotificationRows>>[number]): NotificationItem => ({
  id: row.id,
  type: toNotificationType(row.alert_type),
  title: row.title,
  message: row.message ?? '',
  isRead: row.is_read,
  referenceId: row.id,
  referenceType: 'alert',
  vehicleId: row.vehicle_id,
  vehiclePlateNumber: row.vehicle_plate_number,
  deviceId: row.device_id,
  deviceName: row.device_name,
  contextLabel: row.context_label,
  createdAt: row.created_at.toISOString(),
});

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

  const rows = await findNotificationRows(userId, {
    type: params.type,
    search: params.search,
    from: params.from,
    to: params.to,
  });

  const filteredItems = rows
    .map(buildNotificationItem)
    .filter((item) => (params.isRead === undefined ? true : item.isRead === params.isRead));

  return {
    items: filteredItems.slice(offset, offset + limit),
    unreadCount: filteredItems.reduce((count, item) => (item.isRead ? count : count + 1), 0),
    total: filteredItems.length,
    page,
    limit,
  };
};

export const markRead = async (userId: number, id: number): Promise<void> => {
  await markNotificationRead(userId, id);
};

export const markAllRead = async (userId: number): Promise<void> => {
  await markAllNotificationsRead(userId);
};

export const deleteNotification = async (userId: number, id: number): Promise<void> => {
  await hideNotification(userId, id);
};

export const getNotificationStats = async (
  userId: number,
): Promise<{
  total: number;
  unreadCount: number;
  byType: Record<NotificationType, number>;
}> => {
  const rows = await findNotificationRows(userId, {});

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
    if (!row.is_read) {
      unreadCount += 1;
    }
  }

  return {
    total: Object.values(byType).reduce((sum, count) => sum + count, 0),
    unreadCount,
    byType,
  };
};
