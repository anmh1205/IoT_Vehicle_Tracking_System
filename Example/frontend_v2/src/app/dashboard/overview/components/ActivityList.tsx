'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from './EmptyState';
import { ListSkeleton } from './ListSkeleton';

export function ActivityList({
  activity,
  loading
}: {
  activity: any[] | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className='flex items-center justify-between gap-2'>
        <div>
          <CardTitle>Hoạt động gần đây</CardTitle>
          <CardDescription>Cập nhật realtime</CardDescription>
        </div>
        <Badge variant='live'>Live</Badge>
      </CardHeader>
      <CardContent className='p-0'>
        <ScrollArea className='h-[320px] px-4'>
          {loading ? (
            <ListSkeleton />
          ) : activity && activity.length > 0 ? (
            activity.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className='flex items-start gap-3 border-b last:border-b-0 border-border/60 py-3'
              >
                <div className='mt-1 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold'>
                  {item.device_name?.[0] ?? 'D'}
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-medium text-foreground'>{item.message}</p>
                  <p className='text-xs text-muted-foreground'>
                    {item.device_name} ({item.device_id})
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    {new Date(item.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message='Không có hoạt động gần đây' />
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

