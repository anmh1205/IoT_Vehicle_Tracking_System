export type NotificationType = 'alert' | 'system' | 'export' | 'firmware' | 'zone';

export interface NotificationItem {
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

export interface NotificationListResponse {
  items: NotificationItem[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
}

export interface NotificationStatsSummary {
  total: number;
  unreadCount: number;
  byType: Record<NotificationType, number>;
}
