'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ActivityFeed({ events, isLoading }: { events: any[]; isLoading?: boolean }) {
  return (
    <Card>
      <CardHeader><CardTitle>Hoạt động gần đây</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <p className="text-sm text-muted-foreground">Đang tải...</p> : events.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có hoạt động nào</p> : (
          <div className="space-y-2">{events.map((event: any) => <div key={event.id} className="rounded border p-2 text-sm"><div className="font-medium">{event.eventType}</div><div className="text-muted-foreground">{event.message ?? event.deviceId}</div></div>)}</div>
        )}
      </CardContent>
    </Card>
  );
}

