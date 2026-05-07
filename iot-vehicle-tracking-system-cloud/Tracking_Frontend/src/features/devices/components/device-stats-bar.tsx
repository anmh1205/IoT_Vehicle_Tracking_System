import { Activity, CircleOff, PlugZap, Radio } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import type { Device } from '@/features/devices/types';

export const DeviceStatsBar = ({
  devices,
  totalCount,
}: {
  devices: Device[];
  totalCount?: number;
}) => {
  const totalOnPage = devices.length;
  const connected = devices.filter(
    (device) => device.currentStatus === 'running' || device.currentStatus === 'online',
  ).length;
  const slowTelemetry = devices.filter((device) => device.currentStatus === 'stopped').length;
  const disconnected = devices.filter((device) => device.currentStatus === 'disconnected').length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Tổng thiết bị"
        value={totalCount ?? totalOnPage}
        icon={<Activity className="h-4 w-4" />}
      />
      <StatCard
        title="Còn kết nối trên trang"
        value={connected}
        icon={<Radio className="h-4 w-4 text-emerald-600" />}
        trend={{
          value: `${totalOnPage > 0 ? ((connected / totalOnPage) * 100).toFixed(1) : '0.0'}% trên trang`,
          positive: connected >= slowTelemetry,
        }}
      />
      <StatCard
        title="Chậm nhịp trên trang"
        value={slowTelemetry}
        icon={<PlugZap className="h-4 w-4 text-amber-600" />}
      />
      <StatCard
        title="Mất kết nối trên trang"
        value={disconnected}
        icon={<CircleOff className="h-4 w-4 text-rose-600" />}
        trend={{
          value: `${totalOnPage > 0 ? ((disconnected / totalOnPage) * 100).toFixed(1) : '0.0'}% trên trang`,
          positive: false,
        }}
      />
    </div>
  );
};
