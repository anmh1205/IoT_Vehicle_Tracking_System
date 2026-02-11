'use client';
import type { NotificationItem } from '@/features/notifications/types';
import { Card, CardContent } from '@/components/ui/card';
const countByType = (items: NotificationItem[]) => {
  const result: Record<string, number> = {};
  for (const item of items) {
    result[item.type] = (result[item.type] ?? 0) + 1;
  }
  return result;
};
export const NotificationStats = ({ items }: { items: NotificationItem[] }) => {
  const unreadCount = items.filter((item) => !item.isRead).length;
  const byType = countByType(items);
  return (
    <Card>
      <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Unread</p>
          <p className="text-2xl font-semibold">{unreadCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Alerts</p>
          <p className="text-2xl font-semibold">{byType.alert ?? 0}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">System</p>
          <p className="text-2xl font-semibold">{byType.system ?? 0}</p>
        </div>
      </CardContent>
    </Card>
  );
};
