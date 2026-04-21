'use client';

import { Badge } from '@/components/ui/badge';
import { MAP_STATUS_LABELS } from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';
import { formatRelative } from '@/lib/utils/date/format';
import { cn } from '@/lib/utils';

const STATUS_VARIANTS: Record<
  DevicePosition['status'],
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  running: 'default',
  online: 'secondary',
  stopped: 'outline',
  disconnected: 'outline',
  error: 'destructive',
};

export const DeviceListItem = ({
  device,
  active,
  onClick,
}: {
  device: DevicePosition;
  active: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border px-3 py-3 text-left transition-colors hover:bg-muted/60',
        active && 'border-primary bg-primary/5 shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-semibold">{device.deviceName}</p>
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {device.vehiclePlate ?? device.deviceId ?? 'Chưa gán phương tiện'}
          </p>
        </div>
        <Badge variant={STATUS_VARIANTS[device.status]}>{MAP_STATUS_LABELS[device.status]}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>Tốc độ {device.speed} km/h</span>
        <span>
          {device.timestamp ? `Cập nhật ${formatRelative(device.timestamp)}` : 'Chưa có mốc thời gian'}
        </span>
      </div>
    </button>
  );
};
