'use client';

import { Bell, BellRing, Settings2, TriangleAlert } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import type { NotificationStatsSummary } from '@/features/notifications/types';

export const NotificationStats = ({
  stats,
  isLoading,
}: {
  stats?: NotificationStatsSummary;
  isLoading?: boolean;
}) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Tổng thông báo"
        value={stats?.total ?? 0}
        icon={<Bell className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Chưa đọc"
        value={stats?.unreadCount ?? 0}
        icon={<BellRing className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Cảnh báo"
        value={stats?.byType.alert ?? 0}
        icon={<TriangleAlert className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Hệ thống"
        value={stats?.byType.system ?? 0}
        icon={<Settings2 className="h-4 w-4" />}
        isLoading={isLoading}
      />
    </div>
  );
};
