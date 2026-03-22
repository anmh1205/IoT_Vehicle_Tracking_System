'use client';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '../hooks/use-unread-count';
export const NotificationBadge = ({ onClick }: { onClick: () => void }) => {
  const { data: count = 0 } = useUnreadCount();
  const ariaLabel = count > 0 ? `Mở thông báo, ${count} chưa đọc` : 'Mở thông báo';
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
};
