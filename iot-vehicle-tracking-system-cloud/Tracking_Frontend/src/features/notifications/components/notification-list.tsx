'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Loader2, RefreshCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
import { notificationServices } from '@/lib/api/notifications';
import { NotificationRow } from './notification-item';
import type { NotificationItem } from '@/features/notifications/types';

export const NotificationList = ({
  items,
  total,
  loadedCount,
  unreadCount,
  isLoading,
  isFetching,
  onRefresh,
  hasMore,
  isFetchingNextPage,
  onLoadMore,
}: {
  items: NotificationItem[];
  total: number;
  loadedCount: number;
  unreadCount: number;
  isLoading?: boolean;
  isFetching?: boolean;
  onRefresh?: () => void;
  hasMore?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}) => {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationServices.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-col gap-3 border-b border-border/60 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Hàng đợi xử lý thông báo</p>
            <p className="text-xs text-muted-foreground">
              Hiển thị {loadedCount} / {total} thông báo, còn {unreadCount} mục chưa đọc.
            </p>
          </div>
          {onRefresh ? (
            <Button variant="outline" size="sm" onClick={() => onRefresh()} disabled={isFetching}>
              {isFetching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-4 w-4" />
              )}
              Làm mới
            </Button>
          ) : null}
        </div>

        {items.map((item) => (
          <NotificationRow
            key={item.id}
            notification={item}
            onClick={() => {
              if (!item.isRead) {
                markReadMutation.mutate(item.id);
              }
            }}
            actions={
              <>
                {!item.isRead ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markReadMutation.mutate(item.id)}
                    disabled={markReadMutation.isPending}
                  >
                    <CheckCheck className="mr-2 h-4 w-4" />
                    Đọc
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Ẩn
                </Button>
              </>
            }
          />
        ))}

        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed">
            <EmptyState
              title="Không có thông báo phù hợp"
              description="Hãy nới bộ lọc hoặc làm mới để kiểm tra hàng đợi mới nhất."
              action={onRefresh ? { label: 'Làm mới', onClick: onRefresh } : undefined}
            />
          </div>
        ) : null}
        {onLoadMore ? (
          <InfiniteScrollTrigger
            hasMore={Boolean(hasMore)}
            isLoadingMore={isFetchingNextPage}
            onLoadMore={onLoadMore}
            loadedCount={loadedCount}
            totalCount={total}
            itemLabel="thông báo"
          />
        ) : null}

        {deleteMutation.isPending || markReadMutation.isPending ? (
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang cập nhật trạng thái thông báo...
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
