import { useQuery } from '@tanstack/react-query';
import { notificationServices } from '@/lib/api/notifications';
import type { NotificationStatsSummary } from '@/features/notifications/types';

export const useNotificationStats = () =>
  useQuery<NotificationStatsSummary>({
    queryKey: ['notification-stats'],
    queryFn: () => notificationServices.getStats(),
    refetchInterval: 30000,
  });
