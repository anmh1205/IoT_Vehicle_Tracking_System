import { useQuery } from '@tanstack/react-query';
import { notificationServices } from '@/lib/api/notifications';

export const useNotifications = (params?: Record<string, unknown>) =>
  useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationServices.getList({ limit: 50, ...(params ?? {}) }),
    refetchInterval: 30000,
  });