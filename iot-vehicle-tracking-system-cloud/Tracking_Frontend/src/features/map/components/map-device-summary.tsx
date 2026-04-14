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
  <div className="rounded-xl border bg-background/80 px-3 py-2">
    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-base font-semibold">{value}</p>
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
        <div className="space-y-1">
          <p className="text-sm font-semibold">Tổng quan đội xe hiển thị</p>
          <p className="text-xs text-muted-foreground">
            Danh sách đang ưu tiên xe lỗi, mất kết nối và mốc cập nhật mới nhất.
          </p>
        </div>
        <Badge variant={hiddenCount > 0 ? 'outline' : 'secondary'}>
          {stats.visible}/{stats.total} thiết bị
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <SummaryItem label="Đang chạy" value={stats.running} />
        <SummaryItem label="Cần chú ý" value={stats.attention} />
        <SummaryItem label="Có tọa độ" value={stats.withCoordinates} />
        <SummaryItem label="Đang lọc ẩn" value={hiddenCount} />
      </div>
    </div>
  );
};
