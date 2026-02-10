import { useMemo } from 'react';
import { useNotifications } from './use-notifications';

export const useUnreadCount = () => {
  const query = useNotifications();
  const count = useMemo(() => {
    const payload = query.data;
    if (typeof payload?.unreadCount === 'number') return payload.unreadCount;
    const items = payload?.items ?? payload?.data?.items ?? [];
    return items.filter((item: any) => !item.isRead).length;
  }, [query.data]);

  return { ...query, data: count };
};
