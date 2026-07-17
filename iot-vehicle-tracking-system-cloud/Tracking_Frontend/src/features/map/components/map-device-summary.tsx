'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MapDeviceStats } from './map-panel-utils';

const SummaryItem = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="min-w-[112px] rounded-xl border border-border/60 bg-background/80 px-3 py-2">
    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-semibold">{value}</p>
  </div>
);

export const MapDeviceSummary = ({
  stats,
  className,
}: {
  stats: MapDeviceStats;
  className?: string;
}) => {
  const hiddenCount = Math.max(stats.total - stats.visible, 0);

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/70 bg-background/90 p-3 shadow-lg backdrop-blur-md',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Toàn đội xe</p>
          <p className="text-xs text-muted-foreground">Cập nhật realtime trên bản đồ vận hành</p>
        </div>
        <Badge variant={hiddenCount > 0 ? 'outline' : 'secondary'} className="shrink-0">
          {stats.visible}/{stats.total}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <SummaryItem label="Động cơ bật" value={stats.engineOn} />
        <SummaryItem label="Đang di chuyển" value={stats.moving} />
        <SummaryItem label="Đứng yên" value={stats.stationary} />
        <SummaryItem label="Thiết bị lỗi" value={stats.deviceFaults} />
        <SummaryItem label="Đang ẩn" value={hiddenCount} />
      </div>
    </div>
  );
};
