'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from './EmptyState';
import { ListSkeleton } from './ListSkeleton';

export function AlertsList({
  alerts,
  loading
}: {
  alerts: any[] | undefined;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className='flex items-center justify-between gap-2'>
        <div>
          <CardTitle>Cảnh báo</CardTitle>
          <CardDescription>10 cảnh báo mới nhất</CardDescription>
        </div>
        <Badge variant='destructive'>{alerts?.length ?? 0} alerts</Badge>
      </CardHeader>
      <CardContent className='p-0'>
        <ScrollArea className='h-[320px] px-4'>
          {loading ? (
            <ListSkeleton />
          ) : alerts && alerts.length > 0 ? (
            alerts.slice(0, 10).map((alert) => (
              <div
                key={alert.id}
                className='flex items-start gap-3 border-b last:border-b-0 border-border/60 py-3'
              >
                <div className='mt-1 h-8 w-8 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-xs font-semibold'>
                  !
                </div>
                <div className='min-w-0'>
                  <p className='text-sm font-semibold text-foreground'>
                    <span className='text-destructive'>[{alert.level}]</span> {alert.code}
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    {new Date(alert.created_at).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <EmptyState message='Không có cảnh báo' />
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

