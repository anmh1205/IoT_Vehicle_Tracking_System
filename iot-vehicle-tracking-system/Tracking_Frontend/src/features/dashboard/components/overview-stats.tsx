'use client';

import { Bell, Car, Cpu, Route } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import type { DashboardOverviewStats } from '@/features/dashboard/hooks/use-dashboard-stats';

const formatDelta = (value: number, unit: string) => {
  if (Math.abs(value) < 0.05) {
    return `Tương đương trung bình 7 ngày (${unit})`;
  }

  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}${unit} so với trung bình 7 ngày`;
};

export const OverviewStats = ({
  stats,
  isLoading,
}: {
  stats?: DashboardOverviewStats;
  isLoading?: boolean;
}) => {
  const totalDevices = stats?.totalDevices ?? 0;
  const activeDevices = stats?.activeDevices ?? 0;
  const offlineDevices = stats?.offlineDevices ?? 0;
  const alertsCount = stats?.alertsCount ?? 0;
  const sessionsToday = stats?.sessionsToday ?? 0;
  const runtimeToday = stats?.totalRuntimeToday ?? 0;
  const runtimeWeek = stats?.totalRuntimeWeek ?? 0;

  const activeRate = totalDevices > 0 ? (activeDevices / totalDevices) * 100 : 0;
  const offlineRate = totalDevices > 0 ? (offlineDevices / totalDevices) * 100 : 0;
  const sessionsPerDevice = totalDevices > 0 ? sessionsToday / totalDevices : 0;
  const averageDailyRuntime = runtimeWeek > 0 ? runtimeWeek / 7 : 0;
  const runtimeDelta = runtimeToday - averageDailyRuntime;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng thiết bị"
          value={totalDevices}
          icon={<Car className="h-4 w-4 text-muted-foreground" />}
          subtitle={`${offlineDevices} ngoại tuyến`}
          trend={{ value: `${activeRate.toFixed(1)}% trực tuyến`, positive: activeRate >= 70 }}
          isLoading={isLoading}
        />
        <StatCard
          title="Thiết bị đang chạy"
          value={activeDevices}
          icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
          subtitle={`${(100 - activeRate).toFixed(1)}% còn lại đang dừng hoặc mất kết nối`}
          trend={{ value: `${activeRate.toFixed(1)}%`, positive: activeRate >= 60 }}
          isLoading={isLoading}
        />
        <StatCard
          title="Cảnh báo đang hoạt động"
          value={alertsCount}
          icon={<Bell className="h-4 w-4 text-muted-foreground" />}
          subtitle={`${offlineRate.toFixed(1)}% thiết bị đang ngoại tuyến`}
          trend={{ value: `${offlineDevices} thiết bị`, positive: false }}
          isLoading={isLoading}
        />
        <StatCard
          title="Chuyến đi hôm nay"
          value={sessionsToday}
          icon={<Route className="h-4 w-4 text-muted-foreground" />}
          subtitle={`${runtimeToday.toFixed(1)}h hôm nay / ${runtimeWeek.toFixed(1)}h trong 7 ngày`}
          trend={{
            value: `${sessionsPerDevice.toFixed(1)} phiên / thiết bị`,
            positive: sessionsPerDevice >= 1,
          }}
          isLoading={isLoading}
        />
      </div>

      {!isLoading ? (
        <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>Tỷ lệ hoạt động: {activeRate.toFixed(1)}%</span>
          <span>Tỷ lệ ngoại tuyến: {offlineRate.toFixed(1)}%</span>
          <span>Runtime hôm nay: {formatDelta(runtimeDelta, 'h')}</span>
        </div>
      ) : null}
    </div>
  );
};
