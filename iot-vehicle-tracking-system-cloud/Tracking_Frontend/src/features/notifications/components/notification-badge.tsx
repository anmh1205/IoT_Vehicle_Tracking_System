'use client';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useUnreadCount } from '../hooks/use-unread-count';
export const NotificationBadge = ({ hidden = false, onClick }: { hidden?: boolean; onClick: () => void }) => {
  const { data: count = 0 } = useUnreadCount();
  const ariaLabel = hidden
    ? 'Mở thông báo, số chưa đọc đang ẩn'
    : count > 0
      ? `Mở thông báo, ${count} chưa đọc`
      : 'Mở thông báo';
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {hidden ? (
        <BellOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      ) : (
        <Bell className="h-5 w-5" aria-hidden="true" />
      )}
      {!hidden && count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
};
