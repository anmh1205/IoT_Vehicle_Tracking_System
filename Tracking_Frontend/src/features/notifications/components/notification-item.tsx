'use client';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import type { NotificationItem as Notification } from '../types';

export function NotificationRow({ notification, onClick }: { notification: Notification; onClick: () => void }) {
  return (
    <button className="w-full rounded border p-2 text-left hover:bg-muted" onClick={onClick}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{notification.title}</div>
          <div className="truncate text-xs text-muted-foreground">{notification.message}</div>
          <div className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi })}</div>
        </div>
        {!notification.isRead && <Badge variant="destructive">mới</Badge>}
      </div>
    </button>
  );
}
