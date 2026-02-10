'use client';

import { PageContainer } from '@/components/layout/PageContainer';
import { NotificationCenter } from '@/features/notifications/components/notification-center';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { notificationServices } from '@/lib/api/notifications';
import { Button } from '@/components/ui/button';

export default function NotificationsPage() {
  const list = useNotifications({ limit: 100 });

  return (
    <PageContainer pageTitle='Thông báo' pageDescription='Trung tâm thông báo hệ thống' pageHeaderAction={<NotificationCenter />}>
      <div className='space-y-2'>
        {(list.data?.items ?? []).map((item: any) => (
          <div key={item.id} className='rounded border p-3'>
            <div className='font-medium'>{item.title}</div>
            <div className='text-sm text-muted-foreground'>{item.message}</div>
            {!item.isRead && (
              <Button size='sm' className='mt-2' onClick={() => notificationServices.markRead(item.id)}>
                Đánh dấu đã đọc
              </Button>
            )}
          </div>
        ))}
      </div>
    </PageContainer>
  );
}

