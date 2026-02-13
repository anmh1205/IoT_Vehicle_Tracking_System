import { Activity, CircleOff, PlugZap, Radio } from 'lucide-react';
import type { Device } from '@/features/devices/types';
const StatItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) => {
  return (
    <div className="flex min-w-[140px] items-center gap-2 rounded border bg-muted/30 px-3 py-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
};
export const DeviceStatsBar = ({ devices }: { devices: Device[] }) => {
  const total = devices.length;
  const online = devices.filter((d) => d.currentStatus === 'running').length;
  const stopped = devices.filter((d) => d.currentStatus === 'stopped').length;
  const disconnected = devices.filter((d) => d.currentStatus === 'disconnected').length;
  return (
    <div className="flex flex-wrap gap-2">
      <StatItem icon={<Activity className="h-4 w-4" />} label="Tổng thiết bị" value={total} />
      <StatItem
        icon={<Radio className="h-4 w-4 text-emerald-600" />}
        label="Online"
        value={online}
      />
      <StatItem
        icon={<PlugZap className="h-4 w-4 text-amber-600" />}
        label="Stopped"
        value={stopped}
      />
      <StatItem
        icon={<CircleOff className="h-4 w-4 text-rose-600" />}
        label="Disconnected"
        value={disconnected}
      />
    </div>
  );
};
