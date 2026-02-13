'use client';
import { useMemo, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { useMarkAllRead } from '@/features/notifications/hooks/use-mark-all-read';
import {
  NotificationFilters,
  type NotificationFilterState,
} from '@/features/notifications/components/notification-filters';
import { NotificationStats } from '@/features/notifications/components/notification-stats';
import { NotificationList } from '@/features/notifications/components/notification-list';
import type { NotificationItem } from '@/features/notifications/types';
const DEFAULT_FILTERS: NotificationFilterState = {
  search: '',
  type: 'all',
  readStatus: 'all',
};
const NotificationsPage = () => {
  const [filters, setFilters] = useState<NotificationFilterState>(DEFAULT_FILTERS);
  const notificationsQuery = useNotifications({ limit: 200 });
  const markAllRead = useMarkAllRead();
  const items = useMemo<NotificationItem[]>(() => {
    const rows = notificationsQuery.data?.items ?? notificationsQuery.data?.data?.items ?? [];
    return Array.isArray(rows) ? rows : [];
  }, [notificationsQuery.data]);
  return (
    <PageContainer
      pageTitle="Notifications"
      pageDescription="Filter notifications, review stats, and mark all read"
      pageHeaderAction={
        <Button
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending}
          variant="outline"
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Mark all read
        </Button>
      }
    >
      <NotificationStats items={items} />
      <NotificationFilters value={filters} onChange={setFilters} />
      <NotificationList
        items={items}
        filters={filters}
        isLoading={notificationsQuery.isLoading}
        onRefresh={() => void notificationsQuery.refetch()}
      />
    </PageContainer>
  );
};
export default NotificationsPage;
