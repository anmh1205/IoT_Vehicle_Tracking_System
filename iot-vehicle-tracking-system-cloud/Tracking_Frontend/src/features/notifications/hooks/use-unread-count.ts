import { useNotificationStats } from './use-notification-stats';

export const useUnreadCount = () => {
  const query = useNotificationStats();
  return { ...query, data: query.data?.unreadCount ?? 0 };
};
