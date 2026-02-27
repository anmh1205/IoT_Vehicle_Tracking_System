'use client';
import { Car, Cpu, Bell, Route } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
export const StatCards = ({ stats, isLoading }: { stats: any; isLoading?: boolean }) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Phương tiện"
        value={stats?.totalDevices ?? 0}
        icon={<Car className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Thiết bị trực tuyến"
        value={stats?.activeDevices ?? 0}
        icon={<Cpu className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Cảnh báo"
        value={stats?.alertsCount ?? 0}
        icon={<Bell className="h-4 w-4" />}
        isLoading={isLoading}
      />
      <StatCard
        title="Phiên hôm nay"
        value={stats?.sessionsToday ?? 0}
        icon={<Route className="h-4 w-4" />}
        isLoading={isLoading}
      />
    </div>
  );
};
