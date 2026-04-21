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
  <div className="rounded-lg border bg-background/80 px-2.5 py-2">
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
        'rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background p-3',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-semibold">Tổng quan thiết bị</p>
        <Badge variant={hiddenCount > 0 ? 'outline' : 'secondary'}>
          {stats.visible}/{stats.total}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SummaryItem label="Đang chạy" value={stats.running} />
        <SummaryItem label="Cần chú ý" value={stats.attention} />
        <SummaryItem label="Đủ tọa độ" value={stats.withCoordinates} />
        <SummaryItem label="Đang ẩn" value={hiddenCount} />
      </div>
    </div>
  );
};
