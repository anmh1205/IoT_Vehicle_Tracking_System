'use client';
import { Bell, Car, Cpu, Route, TrendingDown, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import type { DashboardOverviewStats } from '@/features/dashboard/hooks/use-dashboard-stats';
const Trend = ({ value }: { value: number }) => {
  const positive = value >= 0;
  return (
    <span className={positive ? 'text-emerald-600' : 'text-rose-600'}>
      {positive ? (
        <TrendingUp className="mr-1 inline h-3 w-3" />
      ) : (
        <TrendingDown className="mr-1 inline h-3 w-3" />
      )}
      {positive ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
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
  const runtimeTrend = runtimeWeek > 0 ? (runtimeToday / runtimeWeek) * 100 : 0;
  const sessionTrend = totalDevices > 0 ? (sessionsToday / totalDevices) * 100 : 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng thiết bị"
          value={totalDevices}
          icon={<Car className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: `${activeRate.toFixed(1)}% trực tuyến`, positive: activeRate >= 70 }}
          isLoading={isLoading}
        />
        <StatCard
          title="Thiết bị đang chạy"
          value={activeDevices}
          icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: `${activeRate.toFixed(1)}%`, positive: activeRate >= 60 }}
          isLoading={isLoading}
        />
        <StatCard
          title="Cảnh báo đang hoạt động"
          value={alertsCount}
          icon={<Bell className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: `${offlineRate.toFixed(1)}% ngoại tuyến`, positive: false }}
          isLoading={isLoading}
        />
        <StatCard
          title="Chuyến đi hôm nay"
          value={sessionsToday}
          icon={<Route className="h-4 w-4 text-muted-foreground" />}
          trend={{ value: `${sessionTrend.toFixed(1)}% đội xe`, positive: sessionTrend >= 20 }}
          subtitle={`${runtimeToday.toFixed(1)}h hôm nay / ${runtimeWeek.toFixed(1)}h tuần`}
          isLoading={isLoading}
        />
      </div>

      {!isLoading ? (
        <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span>
            Xu hướng runtime: <Trend value={runtimeTrend - 14} />
          </span>
          <span>
            Xu hướng phiên: <Trend value={sessionTrend - 10} />
          </span>
        </div>
      ) : null}
    </div>
  );
};
