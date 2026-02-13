export interface NotificationItem {
  id: number;
  type: 'alert' | 'system' | 'export' | 'firmware' | 'geofence';
  title: string;
  message: string;
  isRead: boolean;
  referenceId: number | null;
  referenceType: string | null;
  createdAt: string;
}
