'use client';

import { useMemo, useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { parseDateKeyAsLocal } from '@/lib/utils';
import { useInfiniteListQuery } from '@/hooks/use-infinite-list-query';
import { notificationServices } from '@/lib/api/notifications';
import { useNotificationStats } from '@/features/notifications/hooks/use-notification-stats';
import { useMarkAllRead } from '@/features/notifications/hooks/use-mark-all-read';
import {
  NotificationFilters,
  type NotificationFilterState,
} from '@/features/notifications/components/notification-filters';
import { NotificationStats } from '@/features/notifications/components/notification-stats';
import { NotificationList } from '@/features/notifications/components/notification-list';
import type { NotificationItem, NotificationListResponse } from '@/features/notifications/types';

const DEFAULT_FILTERS: NotificationFilterState = {
  search: '',
  type: 'all',
  readStatus: 'all',
};

const PAGE_SIZE = 20;

const toDateBoundaryIso = (value: string | undefined, boundary: 'start' | 'end') => {
  if (!value) {
    return undefined;
  }
  const date = parseDateKeyAsLocal(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  if (boundary === 'start') {
    date.setHours(0, 0, 0, 0);
  } else {
    date.setHours(23, 59, 59, 999);
  }
  return date.toISOString();
};

const NotificationsPage = () => {
  const [filters, setFilters] = useState<NotificationFilterState>(DEFAULT_FILTERS);
  const params = useMemo(
    () => ({
      search: filters.search.trim() || undefined,
      type: filters.type === 'all' ? undefined : filters.type,
      isRead:
        filters.readStatus === 'all'
          ? undefined
          : filters.readStatus === 'read',
      from: toDateBoundaryIso(filters.from, 'start'),
      to: toDateBoundaryIso(filters.to, 'end'),
    }),
    [filters],
  );
  const notificationsQuery = useInfiniteListQuery<NotificationItem, NotificationListResponse>({
    queryKey: ['notifications', params],
    pageSize: PAGE_SIZE,
    queryFn: ({ page, limit }) => notificationServices.getList({ ...params, page, limit }),
  });
  const statsQuery = useNotificationStats();
  const markAllRead = useMarkAllRead();
  const items = notificationsQuery.items;

  return (
    <PageContainer
      pageTitle="Thông báo"
      pageDescription="Lọc, phân loại và xử lý thông báo theo từng đợt công việc"
      pageHeaderAction={
        <Button
          onClick={() => markAllRead.mutate()}
          disabled={markAllRead.isPending || (statsQuery.data?.unreadCount ?? 0) === 0}
          variant="outline"
        >
          <CheckCheck className="mr-2 h-4 w-4" />
          Đánh dấu tất cả đã đọc
        </Button>
      }
    >
      <NotificationStats stats={statsQuery.data} isLoading={statsQuery.isLoading} />
      <NotificationFilters
        value={filters}
        onChange={(next) => {
          setFilters(next);
        }}
        onReset={() => {
          setFilters(DEFAULT_FILTERS);
        }}
      />
      <NotificationList
        items={items}
        total={notificationsQuery.total}
        loadedCount={notificationsQuery.loadedCount}
        hasMore={notificationsQuery.hasMore}
        isFetchingNextPage={notificationsQuery.isFetchingNextPage}
        unreadCount={statsQuery.data?.unreadCount ?? 0}
        isLoading={notificationsQuery.isLoading}
        isFetching={notificationsQuery.isFetching}
        onRefresh={() => void notificationsQuery.refetch()}
        onLoadMore={notificationsQuery.loadMore}
      />
    </PageContainer>
  );
};

export default NotificationsPage;
