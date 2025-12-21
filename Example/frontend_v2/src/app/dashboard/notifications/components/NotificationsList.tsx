'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTimestamp } from '@/lib/utils/date/format';

type LocalAlertItem = Dashboard.AlertItemDto & { read?: boolean };

interface NotificationsListProps {
  items: LocalAlertItem[];
  loading: boolean;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NotificationsList({ items, loading, onMarkRead, onDelete }: NotificationsListProps) {
  if (loading && !items.length) {
    return <div className='p-4 text-sm text-muted-foreground'>Đang tải thông báo...</div>;
  }

  if (items.length === 0) {
    return (
      <div className='p-4 text-sm text-muted-foreground'>Không có thông báo.</div>
    );
  }

  return (
    <div className='divide-y'>
      {items.map((item) => (
        <div key={item.id} className='flex items-start gap-3 px-4 py-3 hover:bg-muted/50'>
          <div className='mt-1'>
            <Badge
              variant={
                item.level === 'error'
                  ? 'destructive'
                  : item.level === 'warning'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {item.level?.toUpperCase() || 'INFO'}
            </Badge>
          </div>
          <div className='flex-1 space-y-1 text-sm'>
            <div className='flex items-center justify-between gap-2'>
              <div className='font-medium'>{item.code}</div>
              <div className='text-xs text-muted-foreground'>{formatTimestamp(item.created_at)}</div>
            </div>
            <div className='flex items-center justify-between gap-2 pt-1 text-xs'>
              <div className='text-muted-foreground'>
                Trạng thái:{' '}
                <span className={item.read ? '' : 'font-medium text-primary'}>
                  {item.read ? 'Đã đọc' : 'Chưa đọc'}
                </span>
              </div>
              <div className='flex gap-2'>
                {!item.read && (
                  <Button variant='outline' size='sm' onClick={() => onMarkRead(item.id)}>
                    Đánh dấu đã đọc
                  </Button>
                )}
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-destructive hover:text-destructive'
                  onClick={() => onDelete(item.id)}
                >
                  Ẩn
                </Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

