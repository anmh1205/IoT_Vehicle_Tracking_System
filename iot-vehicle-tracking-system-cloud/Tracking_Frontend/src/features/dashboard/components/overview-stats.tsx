'use client';

import { Bell, Car, Cpu, Route } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import type { DashboardOverviewStats } from '@/features/dashboard/hooks/use-dashboard-stats';

const formatHours = (value: number) => `${value.toFixed(1)} giờ`;

const formatDelta = (value: number) => {
  if (Math.abs(value) < 0.05) {
    return 'Xấp xỉ mức trung bình 7 ngày';
  }

  const amount = formatHours(Math.abs(value));
  return value > 0
    ? `Cao hơn ${amount} so với trung bình 7 ngày`
    : `Thấp hơn ${amount} so với trung bình 7 ngày`;
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
  const inactiveDevices = Math.max(totalDevices - activeDevices, 0);

  const activeRate = totalDevices > 0 ? (activeDevices / totalDevices) * 100 : 0;
  const offlineRate = totalDevices > 0 ? (offlineDevices / totalDevices) * 100 : 0;
  const sessionsPerDevice = totalDevices > 0 ? sessionsToday / totalDevices : 0;
  const averageDailyRuntime = runtimeWeek > 0 ? runtimeWeek / 7 : 0;
  const runtimeDelta = runtimeToday - averageDailyRuntime;

  const totalDevicesSubtitle =
    offlineDevices > 0 ? `${offlineDevices} thiết bị đang ngoại tuyến` : 'Không có thiết bị ngoại tuyến';
  const activeDevicesSubtitle =
    inactiveDevices > 0
      ? `${inactiveDevices} thiết bị còn lại đang dừng hoặc mất kết nối`
      : 'Toàn bộ thiết bị đang gửi dữ liệu';
  const alertsSubtitle =
    offlineDevices > 0
      ? `${offlineDevices} thiết bị cần kiểm tra kết nối`
      : 'Không có thiết bị cần kiểm tra kết nối';
  const tripsSubtitle = `${formatHours(runtimeToday)} hôm nay • TB ${formatHours(averageDailyRuntime)}/ngày`;
  const tripsTrend =
    sessionsToday > 0 ? `${sessionsPerDevice.toFixed(1)} phiên mỗi thiết bị` : 'Chưa phát sinh phiên mới';
  const summaryItems = [
    { label: 'Tỷ lệ hoạt động', value: `${activeRate.toFixed(1)}%` },
    { label: 'Tỷ lệ ngoại tuyến', value: `${offlineRate.toFixed(1)}%` },
    { label: 'Runtime hôm nay', value: formatDelta(runtimeDelta) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng thiết bị"
          value={totalDevices}
          icon={<Car className="h-4 w-4 text-muted-foreground" />}
          subtitle={totalDevicesSubtitle}
          trend={{
            value: `${activeDevices}/${totalDevices || 1} đang gửi đều`,
            positive: activeRate >= 70,
          }}
          isLoading={isLoading}
        />
        <StatCard
          title="Thiết bị đang chạy"
          value={activeDevices}
          icon={<Cpu className="h-4 w-4 text-muted-foreground" />}
          subtitle={activeDevicesSubtitle}
          trend={{ value: `${activeRate.toFixed(1)}% hoạt động`, positive: activeRate >= 60 }}
          isLoading={isLoading}
        />
        <StatCard
          title="Cảnh báo đang hoạt động"
          value={alertsCount}
          icon={<Bell className="h-4 w-4 text-muted-foreground" />}
          subtitle={alertsSubtitle}
          trend={{ value: `${alertsCount} cảnh báo mở`, positive: false }}
          isLoading={isLoading}
        />
        <StatCard
          title="Chuyến đi hôm nay"
          value={sessionsToday}
          icon={<Route className="h-4 w-4 text-muted-foreground" />}
          subtitle={tripsSubtitle}
          trend={{ value: tripsTrend, positive: sessionsPerDevice >= 1 }}
          isLoading={isLoading}
        />
      </div>

      {!isLoading ? (
        <div className="grid gap-2 rounded-xl border bg-muted/20 p-2 md:grid-cols-3">
          {summaryItems.map((item) => (
            <div key={item.label} className="rounded-lg bg-background px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
