'use client';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { notificationServices } from '@/lib/api/notifications';
import { NotificationRow } from './notification-item';
import type { NotificationItem } from '@/features/notifications/types';
import type { NotificationFilterState } from './notification-filters';
const matchDateRange = (value: string, from?: string, to?: string) => {
  if (!from && !to) {
    return true;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  if (from) {
    const fromDate = new Date(from);
    if (date < fromDate) {
      return false;
    }
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (date > toDate) {
      return false;
    }
  }
  return true;
};
export const NotificationList = ({
  items,
  filters,
  isLoading,
  onRefresh,
}: {
  items: NotificationItem[];
  filters: NotificationFilterState;
  isLoading?: boolean;
  onRefresh?: () => void;
}) => {
  const filtered = useMemo(
    () =>
      items.filter((item) => {
        const keyword = filters.search.trim().toLowerCase();
        const matchesSearch =
          keyword.length === 0 ||
          item.title.toLowerCase().includes(keyword) ||
          item.message.toLowerCase().includes(keyword);
        const matchesType = filters.type === 'all' || item.type === filters.type;
        const matchesReadStatus =
          filters.readStatus === 'all' ||
          (filters.readStatus === 'read' ? item.isRead : !item.isRead);
        const matchesDate = matchDateRange(item.createdAt, filters.from, filters.to);
        return matchesSearch && matchesType && matchesReadStatus && matchesDate;
      }),
    [items, filters],
  );
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        {filtered.map((item) => (
          <div key={item.id} className="rounded-lg border p-2">
            <NotificationRow
              notification={item}
              onClick={() => {
                if (!item.isRead) {
                  void notificationServices.markRead(item.id).finally(() => onRefresh?.());
                }
              }}
            />
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed">
            <EmptyState
              title="Chưa có dữ liệu"
              description="Không có kết quả phù hợp bộ lọc"
              action={onRefresh ? { label: 'Thử lại', onClick: onRefresh } : undefined}
            />
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => onRefresh?.()}>
            Thử lại
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
