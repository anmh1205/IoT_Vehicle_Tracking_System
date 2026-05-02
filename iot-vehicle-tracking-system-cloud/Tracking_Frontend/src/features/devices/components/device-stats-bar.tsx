import { Activity, CircleOff, PlugZap, Radio } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import type { Device } from '@/features/devices/types';

export const DeviceStatsBar = ({ devices }: { devices: Device[] }) => {
  const total = devices.length;
  const online = devices.filter(
    (d) => d.currentStatus === 'running' || d.currentStatus === 'online',
  ).length;
  const stopped = devices.filter((d) => d.currentStatus === 'stopped').length;
  const disconnected = devices.filter((d) => d.currentStatus === 'disconnected').length;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Tổng thiết bị" value={total} icon={<Activity className="h-4 w-4" />} />
      <StatCard
        title="Trực tuyến"
        value={online}
        icon={<Radio className="h-4 w-4 text-emerald-600" />}
        trend={{
          value: `${total > 0 ? ((online / total) * 100).toFixed(1) : '0.0'}% trực tuyến`,
          positive: online >= stopped,
        }}
      />
      <StatCard
        title="Đã dừng"
        value={stopped}
        icon={<PlugZap className="h-4 w-4 text-amber-600" />}
      />
      <StatCard
        title="Mất kết nối"
        value={disconnected}
        icon={<CircleOff className="h-4 w-4 text-rose-600" />}
        trend={{
          value: `${total > 0 ? ((disconnected / total) * 100).toFixed(1) : '0.0'}% toàn đội`,
          positive: false,
        }}
      />
    </div>
  );
};
