'use client';

import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { localizeAlertMessage, localizeAlertTitle } from '@/lib/api/alerts';
import { formatRelative } from '@/lib/utils/date/format';
import type { NotificationItem as Notification } from '../types';

const TYPE_LABELS: Record<Notification['type'], string> = {
  alert: 'Cảnh báo',
  system: 'Hệ thống',
  export: 'Xuất dữ liệu',
  firmware: 'Firmware',
  zone: 'Vùng',
};

const TYPE_VARIANTS: Record<
  Notification['type'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  alert: 'destructive',
  system: 'secondary',
  export: 'outline',
  firmware: 'default',
  zone: 'secondary',
};

const getContextText = (notification: Notification) => {
  if (notification.contextLabel) {
    return notification.contextLabel;
  }

  const parts = [
    notification.vehiclePlateNumber
      ? `Xe ${notification.vehiclePlateNumber}`
      : notification.vehicleId
        ? `Xe ${notification.vehicleId}`
        : null,
    notification.deviceName
      ? `Thiết bị ${notification.deviceName}`
      : notification.deviceId
        ? `Thiết bị ${notification.deviceId}`
        : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : null;
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
  const contextText = getContextText(notification);
  const displayTitle = localizeAlertTitle(notification.title, notification.type) ?? notification.title;
  const displayMessage =
    localizeAlertMessage(notification.message, notification.type) ?? notification.message;

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
          <div className="text-sm font-medium">{displayTitle}</div>
          <div
            className={compact ? 'truncate text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}
          >
            {displayMessage || 'Không có mô tả chi tiết.'}
          </div>
          {contextText ? (
            <div className="text-xs font-medium text-muted-foreground/80">{contextText}</div>
          ) : null}
        </div>
      </Wrapper>
      {actions ? <div className="flex shrink-0 flex-col gap-2 self-start">{actions}</div> : null}
    </div>
  );
};
