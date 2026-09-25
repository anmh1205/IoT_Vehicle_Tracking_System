import type {
  NotificationRow,
  NotificationType,
} from '@/domain/notification/repositories/notification.repository';
import {
  findNotificationPage,
  getNotificationCounts,
  getNotificationStats as getNotificationStatsAggregate,
  hideNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/domain/notification/repositories/notification.repository';
import { publishEvent } from '@/infrastructure/realtime';
import * as pushTokenRepo from '@/domain/notification/repositories/push-token.repository';
import type { PushTokenDeviceInfo } from '@/domain/notification/repositories/push-token.repository';

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
  if (normalized.includes('zone') || normalized.includes('geofence')) return 'zone';
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

const buildNotificationItem = (row: NotificationRow): NotificationItem => ({
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
  const filters = {
    type: params.type,
    search: params.search,
    from: params.from,
    to: params.to,
    isRead: params.isRead,
  };

  const [rows, counts] = await Promise.all([
    findNotificationPage(userId, filters, limit, offset),
    getNotificationCounts(userId, filters),
  ]);

  return {
    items: rows.map(buildNotificationItem),
    unreadCount: counts.unreadCount,
    total: counts.total,
    page,
    limit,
  };
};

export const markRead = async (userId: number, id: number): Promise<void> => {
  await markNotificationRead(userId, id);
  publishEvent('notification:updated', {
    user_id: userId,
    id,
    action: 'read',
  });
};

export const markAllRead = async (userId: number): Promise<void> => {
  await markAllNotificationsRead(userId);
  publishEvent('notification:updated', {
    user_id: userId,
    unreadCount: 0,
    action: 'read_all',
  });
};

export const deleteNotification = async (userId: number, id: number): Promise<void> => {
  await hideNotification(userId, id);
  publishEvent('notification:updated', {
    user_id: userId,
    id,
    action: 'hidden',
  });
};

export const getNotificationStats = async (
  userId: number,
): Promise<{
  total: number;
  unreadCount: number;
  byType: Record<NotificationType, number>;
}> => getNotificationStatsAggregate(userId);

export const registerPushToken = async (
  userId: number,
  token: string,
  deviceInfo?: PushTokenDeviceInfo,
): Promise<void> => {
  await pushTokenRepo.registerPushToken(userId, token, deviceInfo);
};

export const unregisterPushToken = async (
  userId: number,
  token: string,
): Promise<boolean> => pushTokenRepo.unregisterPushToken(userId, token);
