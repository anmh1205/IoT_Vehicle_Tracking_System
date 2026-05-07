'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationBadge } from './notification-badge';
import { NotificationRow } from './notification-item';
import { useNotifications } from '../hooks/use-notifications';
import { notificationServices } from '@/lib/api/notifications';

const getTarget = (item: any) => {
  if (item.referenceType === 'alert' && item.referenceId) {
    return '/dashboard/attention/queue';
  }
  if (item.type === 'export') {
    return '/dashboard/platform/exports';
  }
  if (item.type === 'firmware') {
    return '/dashboard/platform/firmware';
  }
  if (item.type === 'zone') {
    return '/dashboard/zones';
  }
  return '/dashboard/command';
};

export const NotificationDropdown = () => {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const notifications = useNotifications({ limit: 8 });
  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationServices.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });
  const markAllMutation = useMutation({
    mutationFn: () => notificationServices.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
    },
  });
  const items = notifications.data?.items ?? [];
  const unreadCount = notifications.data?.unreadCount ?? items.filter((item) => !item.isRead).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div>
          <NotificationBadge onClick={() => setOpen((value) => !value)} />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex max-h-[min(calc(100vh-5rem),34rem)] w-[min(92vw,24rem)] flex-col overflow-hidden p-0"
      >
        <div className="flex shrink-0 items-center justify-between border-b p-3">
          <div className="text-sm font-semibold">Thông báo</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending || unreadCount === 0}
          >
            {markAllMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Đánh dấu tất cả
          </Button>
        </div>

        <div className="min-h-0 max-h-[min(65vh,24rem)] overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="space-y-2 p-3">
            {notifications.isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : null}

            {!notifications.isLoading && items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                <Inbox className="h-5 w-5" />
                <p>Chưa có thông báo mới.</p>
              </div>
            ) : null}

            {items.map((item) => (
              <NotificationRow
                key={item.id}
                notification={item}
                compact
                showType={false}
                onClick={() => {
                  if (!item.isRead) {
                    markReadMutation.mutate(item.id);
                  }
                  setOpen(false);
                  const target = getTarget(item);
                  if (pathname !== target) {
                    router.push(target);
                  }
                }}
              />
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t bg-popover p-2 text-center text-xs text-muted-foreground">
          <Link href="/dashboard/attention/notifications" className="underline">
            Xem toàn bộ thông báo
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};
