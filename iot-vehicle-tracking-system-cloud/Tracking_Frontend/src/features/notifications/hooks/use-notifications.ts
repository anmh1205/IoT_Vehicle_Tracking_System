import { useQuery } from '@tanstack/react-query';
import { notificationServices } from '@/lib/api/notifications';
import type { NotificationListResponse, NotificationType } from '@/features/notifications/types';

export interface NotificationsQueryParams {
  page?: number;
  limit?: number;
  type?: NotificationType;
  isRead?: boolean;
  search?: string;
  from?: string;
  to?: string;
}

export const useNotifications = (params?: NotificationsQueryParams) =>
  useQuery<NotificationListResponse>({
    queryKey: ['notifications', params],
    queryFn: () => notificationServices.getList({ limit: 50, ...(params ?? {}) }),
    refetchInterval: 30000,
  });
