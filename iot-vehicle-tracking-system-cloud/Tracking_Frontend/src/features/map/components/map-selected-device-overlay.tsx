'use client';

import { Battery, CarFront, Gauge, MapPin, Navigation, Thermometer, Timer, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  hasValidMapCoordinates,
  MAP_STATUS_COLORS,
  MAP_STATUS_LABELS,
} from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';
import { formatRelative } from '@/lib/utils/date/format';

const formatMetric = (value: number | null | undefined, unit: string, digits = 1): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }
  return `${value.toFixed(digits)}${unit}`;
};

const metricBlockClass =
  'shrink-0 rounded-lg border border-border/65 bg-background/80 px-2.5 py-1.5';

export const MapSelectedDeviceOverlay = ({
  device,
  onClose,
}: {
  device: DevicePosition | null;
  onClose: () => void;
}) => {
  if (!device) {
    return null;
  }

  const statusColor = MAP_STATUS_COLORS[device.status] ?? MAP_STATUS_COLORS.disconnected;

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[910]">
      <div className="pointer-events-auto relative overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-md">
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background: `linear-gradient(90deg, ${statusColor} 0%, ${statusColor}AA 45%, transparent 100%)`,
          }}
        />

        <div className="flex items-center gap-2 overflow-x-auto px-3 py-2.5">
          <div className="flex min-w-[17rem] items-center gap-2.5 pr-1">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
              style={{ backgroundColor: statusColor }}
              aria-hidden="true"
            >
              <CarFront className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="line-clamp-1 text-sm font-semibold">{device.deviceName}</p>
                <Badge className="border-transparent text-white" style={{ backgroundColor: statusColor }}>
                  {MAP_STATUS_LABELS[device.status]}
                </Badge>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {device.vehiclePlate ?? 'Chưa gán phương tiện'} · {device.deviceId}
              </p>
            </div>
          </div>

          <div className={metricBlockClass}>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Tốc độ</p>
            <p className="mt-0.5 text-sm font-semibold">{formatMetric(device.speed, ' km/h')}</p>
          </div>

          <div className={metricBlockClass}>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Hướng</p>
            <p className="mt-0.5 text-sm font-semibold">{formatMetric(device.heading, '°')}</p>
          </div>

          <div className={metricBlockClass}>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Pin</p>
            <p className="mt-0.5 text-sm font-semibold">{formatMetric(device.battery, '%')}</p>
          </div>

          <div className={metricBlockClass}>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Nhiệt độ</p>
            <p className="mt-0.5 text-sm font-semibold">{formatMetric(device.temperature, '°C')}</p>
          </div>

          <div className={metricBlockClass}>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Cập nhật</p>
            <p className="mt-0.5 line-clamp-1 text-sm font-semibold">{formatRelative(device.timestamp)}</p>
          </div>

          <div className={`${metricBlockClass} min-w-[15rem]`}>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Tọa độ</p>
            <p className="mt-0.5 text-sm font-semibold">
              {hasValidMapCoordinates(device) ? `${device.lat.toFixed(5)}, ${device.lon.toFixed(5)}` : '--'}
            </p>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1 pl-1">
            <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex">
              <Gauge className="h-3.5 w-3.5" />
              <Navigation className="h-3.5 w-3.5" />
              <Battery className="h-3.5 w-3.5" />
              <Thermometer className="h-3.5 w-3.5" />
              <Timer className="h-3.5 w-3.5" />
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-full border border-border/70 bg-background/90"
              onClick={onClose}
              aria-label="Đóng thông tin thiết bị"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
