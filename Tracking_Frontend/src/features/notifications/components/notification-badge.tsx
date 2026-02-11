'use client';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useUnreadCount } from '../hooks/use-unread-count';
export const NotificationBadge = ({ onClick }: { onClick: () => void }) => {
  const { data: count = 0 } = useUnreadCount();
  return (
    <Button variant="ghost" size="icon" className="relative" onClick={onClick}>
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
};
