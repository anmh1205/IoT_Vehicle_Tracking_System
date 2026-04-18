'use client';

import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Battery,
  CarFront,
  Clock3,
  Gauge,
  MapPin,
  Thermometer,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  hasValidMapCoordinates,
  MAP_STATUS_COLORS,
  MAP_STATUS_LABELS,
} from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';
import { formatRelative } from '@/lib/utils/date/format';
import { cn } from '@/lib/utils';

const formatNumber = (value: number | null | undefined, unit: string, digits = 1) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '--';
  }
  return `${value.toFixed(digits)}${unit}`;
};

const formatVoltage = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return '--';
  }
  const unit = value > 24 ? '%' : 'V';
  return `${value.toFixed(1)}${unit}`;
};

const MetricCard = ({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex min-w-[112px] items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2',
      className,
    )}
  >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold leading-tight">{value}</p>
    </div>
  </div>
);

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
  const alertTitles = (device.activeAlertTitles ?? []).filter(Boolean);
  const visibleAlertTitles = alertTitles.slice(0, 4);

  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[910]">
      <div className="pointer-events-auto overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-md">
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${statusColor} 0%, ${statusColor}B3 35%, transparent 100%)`,
          }}
        />

        <div className="grid gap-3 px-4 py-3">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
              style={{ backgroundColor: statusColor }}
              aria-hidden="true"
            >
              <CarFront className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="line-clamp-1 text-sm font-semibold">{device.deviceName}</p>
                <Badge className="border-transparent text-white" style={{ backgroundColor: statusColor }}>
                  {MAP_STATUS_LABELS[device.status]}
                </Badge>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {device.vehiclePlate ?? 'Chưa gán phương tiện'} · {device.deviceId}
                {device.customerName ? ` · ${device.customerName}` : ''}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {hasValidMapCoordinates(device)
                    ? `${device.lat.toFixed(5)}, ${device.lon.toFixed(5)}`
                    : 'Chưa có tọa độ hợp lệ'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {device.timestamp ? `Cập nhật ${formatRelative(device.timestamp)}` : 'Chưa có mốc thời gian'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 rounded-full border border-border/70 bg-background/90"
              onClick={onClose}
              aria-label="Ẩn thông tin thiết bị"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-stretch gap-2">
            <MetricCard label="Tốc độ" value={formatNumber(device.speed, ' km/h')} icon={<Gauge className="h-4 w-4" />} />
            <MetricCard label="Tua máy" value={formatNumber(device.rpm, ' rpm', 0)} icon={<Gauge className="h-4 w-4" />} />
            <MetricCard label="Pin" value={formatVoltage(device.deviceBattery ?? device.battery)} icon={<Battery className="h-4 w-4" />} />
            <MetricCard label="Ắc quy" value={formatVoltage(device.vehicleBattery ?? device.battery)} icon={<CarFront className="h-4 w-4" />} />
            <MetricCard
              label="Nhiệt độ máy"
              value={formatNumber(device.engineTemperature ?? device.temperature, '°C')}
              icon={<Thermometer className="h-4 w-4" />}
            />

            <TooltipProvider>
              <div className="ml-auto flex min-w-[92px] items-center justify-end gap-1 rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                {visibleAlertTitles.length > 0 ? (
                  <>
                    {visibleAlertTitles.map((title, index) => (
                      <Tooltip key={`${title}-${index}`}>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-red-500">
                            <AlertTriangle className="h-4 w-4" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          {title}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {alertTitles.length > visibleAlertTitles.length ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-red-500/15 px-2 text-xs font-semibold text-red-500">
                            +{alertTitles.length - visibleAlertTitles.length}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" sideOffset={6}>
                          {alertTitles.slice(visibleAlertTitles.length).join(', ')}
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </>
                ) : (
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                )}
              </div>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
};
