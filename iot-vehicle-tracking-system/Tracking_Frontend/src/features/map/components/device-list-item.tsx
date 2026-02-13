'use client';
import { cn } from '@/lib/utils';
import { MAP_STATUS_LABELS } from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';
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
        'w-full rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted',
        active && 'border-primary bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="line-clamp-1 text-sm font-semibold">{device.deviceName}</p>
        <span className="text-xs text-muted-foreground">{device.speed} km/h</span>
      </div>
      <p className="text-xs text-muted-foreground">{device.deviceId}</p>
      <p className="mt-1 text-xs">Status: {MAP_STATUS_LABELS[device.status]}</p>
    </button>
  );
};
