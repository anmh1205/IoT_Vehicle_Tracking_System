'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationBadge } from './notification-badge';
import { NotificationRow } from './notification-item';
import { useNotifications } from '../hooks/use-notifications';
import { notificationServices } from '@/lib/api/notifications';

function getTarget(item: any) {
  if (item.referenceType === 'alert' && item.referenceId) return `/dashboard/alerts`;
  if (item.type === 'export') return '/dashboard/exports';
  if (item.type === 'firmware') return '/dashboard/firmware';
  if (item.type === 'geofence') return '/dashboard/map';
  return '/dashboard';
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const notifications = useNotifications();

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationServices.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationServices.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = notifications.data?.items ?? notifications.data?.data?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div><NotificationBadge onClick={() => setOpen((v) => !v)} /></div>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <div className="text-sm font-semibold">Thông báo</div>
          <Button variant="ghost" size="sm" onClick={() => markAllMutation.mutate()}>Đọc tất cả</Button>
        </div>
        <ScrollArea className="h-[360px] p-3">
          <div className="space-y-2">
            {items.map((item: any) => (
              <NotificationRow
                key={item.id}
                notification={item}
                onClick={() => {
                  markReadMutation.mutate(item.id);
                  setOpen(false);
                  const target = getTarget(item);
                  if (pathname !== target) router.push(target);
                }}
              />
            ))}
          </div>
        </ScrollArea>
        <div className="border-t p-2 text-center text-xs text-muted-foreground">
          <Link href="/dashboard/alerts" className="underline">Xem tất cả thông báo</Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

