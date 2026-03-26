'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/utils/date/format';
import type { NotificationItem as Notification } from '../types';

const TYPE_LABELS: Record<Notification['type'], string> = {
  alert: 'Cảnh báo',
  system: 'Hệ thống',
  export: 'Xuất dữ liệu',
  firmware: 'Firmware',
  geofence: 'Geofence',
};

const TYPE_VARIANTS: Record<
  Notification['type'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  alert: 'destructive',
  system: 'secondary',
  export: 'outline',
  firmware: 'default',
  geofence: 'secondary',
};

export const NotificationRow = ({
  notification,
  onClick,
  actions,
  compact = false,
  showType = true,
}: {
  notification: Notification;
  onClick?: () => void;
  actions?: ReactNode;
  compact?: boolean;
  showType?: boolean;
}) => {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <div className="flex gap-3 rounded-xl border border-border/60 bg-card/70 p-3 transition-colors hover:bg-accent/30">
      <Wrapper
        {...(onClick ? { type: 'button', onClick } : {})}
        className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex flex-wrap items-center gap-2">
          {showType ? (
            <Badge variant={TYPE_VARIANTS[notification.type]}>{TYPE_LABELS[notification.type]}</Badge>
          ) : null}
          {!notification.isRead ? <Badge variant="destructive">Mới</Badge> : null}
          <span className="text-xs text-muted-foreground">{formatRelative(notification.createdAt)}</span>
        </div>
        <div className="mt-2 space-y-1">
          <div className="text-sm font-medium">{notification.title}</div>
          <div className={compact ? 'truncate text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>
            {notification.message || 'Không có mô tả chi tiết.'}
          </div>
        </div>
      </Wrapper>
      {actions ? <div className="flex shrink-0 flex-col gap-2 self-start">{actions}</div> : null}
    </div>
  );
};
