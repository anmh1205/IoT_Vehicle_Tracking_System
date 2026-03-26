'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardEvent } from '@/features/dashboard/hooks/use-dashboard-stats';
import { formatRelative } from '@/lib/utils/date/format';

export const ActivityFeed = ({
  events,
  isLoading,
}: {
  events: DashboardEvent[];
  isLoading?: boolean;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dòng hoạt động thời gian thực</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-2">
              {events.slice(0, 10).map((event) => (
                <div key={String(event.id)} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{event.eventType}</p>
                    <Badge variant="outline">{event.severity ?? 'thông tin'}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.message || event.deviceId || 'Không có chi tiết'}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatRelative(event.serverTimestamp)}
                  </p>
                </div>
              ))}
              {events.length === 0 ? (
                <p className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                  Chưa có hoạt động gần đây.
                </p>
              ) : null}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
