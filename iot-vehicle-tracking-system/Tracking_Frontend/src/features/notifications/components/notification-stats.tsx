'use client';
import { Bell, BellRing, Settings2, TriangleAlert } from 'lucide-react';
import type { NotificationItem } from '@/features/notifications/types';
import { StatCard } from '@/components/common/stat-card';

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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Tổng thông báo" value={items.length} icon={<Bell className="h-4 w-4" />} />
      <StatCard title="Chưa đọc" value={unreadCount} icon={<BellRing className="h-4 w-4" />} />
      <StatCard title="Cảnh báo" value={byType.alert ?? 0} icon={<TriangleAlert className="h-4 w-4" />} />
      <StatCard title="Hệ thống" value={byType.system ?? 0} icon={<Settings2 className="h-4 w-4" />} />
    </div>
  );
};
