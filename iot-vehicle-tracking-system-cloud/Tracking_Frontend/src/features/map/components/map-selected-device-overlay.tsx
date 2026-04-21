'use client';

import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Battery,
  CarFront,
  Clock3,
  Eye,
  EyeOff,
  Gauge,
  MapPin,
  MapPinned,
  Thermometer,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { VehicleAllowedZone } from '@/lib/api/geofences';
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

const membershipMeta: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  inside: { label: 'Đang trong vùng', variant: 'default' },
  outside: { label: 'Đang ngoài vùng', variant: 'destructive' },
  suspect: { label: 'Sát mép vùng', variant: 'secondary' },
  unknown: { label: 'Chưa đánh giá', variant: 'outline' },
};

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

const dedupeAlertTitles = (titles: string[]) => {
  const seen = new Set<string>();
  return titles.filter((title) => {
    const normalized = title.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
};

const resolveVehicleStatus = (
  speed: number | null | undefined,
  alertCount: number,
): {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
} => {
  if (alertCount > 0) {
    return {
      label: 'Xe: Cảnh báo',
      variant: 'destructive',
      className: '',
    };
  }

  const nextSpeed = Number(speed);
  if (Number.isFinite(nextSpeed) && nextSpeed > 3) {
    return {
      label: 'Xe: Đang lái',
      variant: 'default',
      className: '',
    };
  }

  return {
    label: 'Xe: Đang đỗ',
    variant: 'outline',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  };
};

const normalizeAlertTitle = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const resolveAlertVisual = (
  title: string,
): { icon: LucideIcon; toneClassName: string; label: string } => {
  const normalized = normalizeAlertTitle(title);

  if (/(pin|battery|ac quy|voltage|dien ap|nguon)/.test(normalized)) {
    return {
      icon: Battery,
      toneClassName: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      label: 'Pin/nguồn',
    };
  }

  if (/(speed|toc do|qua toc|overspeed|rpm|vong tua)/.test(normalized)) {
    return {
      icon: Gauge,
      toneClassName: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
      label: 'Tốc độ',
    };
  }

  if (/(nhiet|temperature|coolant|heat|nong|overheat)/.test(normalized)) {
    return {
      icon: Thermometer,
      toneClassName: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
      label: 'Nhiệt độ',
    };
  }

  if (/(gps|toa do|vi tri|geofence|vung|offline|mat ket noi|signal|ket noi|channel)/.test(normalized)) {
    return {
      icon: MapPin,
      toneClassName: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
      label: 'Vị trí/kết nối',
    };
  }

  if (/(obd|dtc|dong co|engine|phanh|brake|bao duong|maintenance)/.test(normalized)) {
    return {
      icon: CarFront,
      toneClassName: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400',
      label: 'Động cơ/bảo dưỡng',
    };
  }

  return {
    icon: AlertTriangle,
    toneClassName: 'bg-red-500/15 text-red-500 dark:text-red-400',
    label: 'Cảnh báo chung',
  };
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
    data-metric="true"
    className={cn(
      'flex min-w-[118px] items-center gap-2 rounded-xl border border-border/60 bg-background/70 px-3 py-2',
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
  allowedZone,
  allowedZoneLoading = false,
  showAllowedZone = false,
  canEditAllowedZone = false,
  onClose,
  onCreateAllowedZone,
  onEditAllowedZone,
  onToggleAllowedZoneVisibility,
  condensed = false,
  className,
}: {
  device: DevicePosition | null;
  allowedZone?: VehicleAllowedZone | null;
  allowedZoneLoading?: boolean;
  showAllowedZone?: boolean;
  canEditAllowedZone?: boolean;
  onClose: () => void;
  onCreateAllowedZone?: () => void;
  onEditAllowedZone?: () => void;
  onToggleAllowedZoneVisibility?: () => void;
  condensed?: boolean;
  className?: string;
}) => {
  if (!device) {
    return null;
  }

  const statusColor = MAP_STATUS_COLORS[device.status] ?? MAP_STATUS_COLORS.disconnected;
  const alertTitles = dedupeAlertTitles((device.activeAlertTitles ?? []).filter(Boolean));
  const alertCount = Math.max(device.activeAlertCount ?? alertTitles.length, alertTitles.length);
  const vehicleStatus = resolveVehicleStatus(device.speed, alertCount);
  const normalizedAlertTitles =
    alertTitles.length > 0
      ? alertTitles
      : alertCount > 0
        ? [`Có ${alertCount} cảnh báo đang mở`]
        : [];
  const visibleAlertTitles = normalizedAlertTitles.slice(0, condensed ? 2 : 3);
  const allowedZoneMembership = membershipMeta[allowedZone?.membershipState ?? 'unknown'] ?? membershipMeta.unknown;
  const metrics = condensed
    ? [
        {
          label: 'Tốc độ',
          value: formatNumber(device.speed, ' km/h'),
          icon: <Gauge className="h-4 w-4" />,
        },
        {
          label: 'Cập nhật',
          value: device.timestamp ? formatRelative(device.timestamp) : 'Chưa có mốc',
          icon: <Clock3 className="h-4 w-4" />,
        },
        {
          label: 'Pin thiết bị',
          value: formatVoltage(device.deviceBattery ?? device.battery),
          icon: <Battery className="h-4 w-4" />,
        },
        {
          label: 'Tọa độ',
          value: hasValidMapCoordinates(device)
            ? `${device.lat.toFixed(5)}, ${device.lon.toFixed(5)}`
            : 'Chưa có tọa độ',
          icon: <MapPin className="h-4 w-4" />,
          className: 'min-w-[180px]',
        },
      ]
    : [
        {
          label: 'Tốc độ',
          value: formatNumber(device.speed, ' km/h'),
          icon: <Gauge className="h-4 w-4" />,
        },
        {
          label: 'Tua máy',
          value: formatNumber(device.rpm, ' rpm', 0),
          icon: <Gauge className="h-4 w-4" />,
        },
        {
          label: 'Pin thiết bị',
          value: formatVoltage(device.deviceBattery ?? device.battery),
          icon: <Battery className="h-4 w-4" />,
        },
        {
          label: 'Ắc quy xe',
          value: formatVoltage(device.vehicleBattery ?? device.battery),
          icon: <CarFront className="h-4 w-4" />,
        },
        {
          label: 'Nhiệt độ máy',
          value: formatNumber(device.engineTemperature ?? device.temperature, '°C'),
          icon: <Thermometer className="h-4 w-4" />,
        },
        {
          label: 'Tọa độ',
          value: hasValidMapCoordinates(device)
            ? `${device.lat.toFixed(5)}, ${device.lon.toFixed(5)}`
            : 'Chưa có tọa độ',
          icon: <MapPin className="h-4 w-4" />,
          className: 'min-w-[180px]',
        },
        {
          label: 'Cập nhật',
          value: device.timestamp ? formatRelative(device.timestamp) : 'Chưa có mốc',
          icon: <Clock3 className="h-4 w-4" />,
          className: 'min-w-[154px]',
        },
      ];

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-2 bottom-0 z-[910] pb-[max(0.35rem,var(--safe-area-bottom))] md:inset-x-3',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-auto w-full overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-md',
          condensed && 'w-full md:max-w-[760px]',
        )}
      >
        <div
          className="h-1 w-full"
          style={{
            background: `linear-gradient(90deg, ${statusColor} 0%, ${statusColor}B3 35%, transparent 100%)`,
          }}
        />

        <div className={cn('grid gap-3 px-4 py-3', condensed && 'gap-2.5')}>
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
                  Thiết bị: {MAP_STATUS_LABELS[device.status]}
                </Badge>
                <Badge variant={vehicleStatus.variant} className={vehicleStatus.className}>
                  {vehicleStatus.label}
                </Badge>
                <TooltipProvider delayDuration={100}>
                  {visibleAlertTitles.length > 0 ? (
                    <div className="flex items-center gap-1.5">
                      {visibleAlertTitles.map((title, index) => {
                        const visual = resolveAlertVisual(title);
                        const AlertIcon = visual.icon;
                        return (
                          <Tooltip key={`${title}-${index}`}>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className={cn(
                                  'inline-flex h-7 w-7 items-center justify-center rounded-full border border-transparent transition-colors hover:border-border/60',
                                  visual.toneClassName,
                                )}
                                aria-label={`${visual.label}: ${title}`}
                              >
                                <AlertIcon className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top" sideOffset={8} className="z-[1200] max-w-[280px] text-xs leading-relaxed">
                              {title}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}

                      {normalizedAlertTitles.length > visibleAlertTitles.length ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-red-500/15 px-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400"
                              aria-label={`Còn ${normalizedAlertTitles.length - visibleAlertTitles.length} cảnh báo`}
                            >
                              +{normalizedAlertTitles.length - visibleAlertTitles.length}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" sideOffset={8} className="z-[1200] max-w-[280px] text-xs leading-relaxed">
                            {normalizedAlertTitles.slice(visibleAlertTitles.length).join(', ')}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    >
                      Không có cảnh báo mở
                    </Badge>
                  )}
                </TooltipProvider>
                {condensed ? (
                  <Badge variant="outline">{device.vehiclePlate ?? 'Chưa gán biển số'}</Badge>
                ) : null}
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {device.vehiclePlate ?? 'Chưa gán phương tiện'} · {device.deviceId}
                {device.customerName ? ` · ${device.customerName}` : ''}
              </p>
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

          <div className={cn('flex flex-wrap items-stretch gap-2', condensed && 'gap-1.5')}>
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                icon={metric.icon}
                className={metric.className}
              />
            ))}
          </div>

          {device.vehicleId ? (
            <div className="space-y-3 border-t border-border/60 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">Vùng cho phép</p>
                {allowedZoneLoading ? <Badge variant="outline">Đang tải...</Badge> : null}
                {!allowedZoneLoading ? (
                  <Badge variant={allowedZone ? 'secondary' : 'outline'}>
                    {allowedZone ? 'Đã cấu hình' : 'Chưa thiết lập'}
                  </Badge>
                ) : null}
                {allowedZone ? <Badge variant={allowedZoneMembership.variant}>{allowedZoneMembership.label}</Badge> : null}
                {allowedZone ? <Badge variant="outline">{Math.round(allowedZone.radiusMeters)} m</Badge> : null}
              </div>

              {!allowedZoneLoading && !allowedZone ? (
                <p className="text-xs text-muted-foreground">Phương tiện này chưa có vùng cho phép hoạt động.</p>
              ) : null}
              {allowedZone?.warning ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">{allowedZone.warning.message}</p>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                {allowedZone && onToggleAllowedZoneVisibility ? (
                  <Button type="button" variant="outline" onClick={onToggleAllowedZoneVisibility}>
                    {showAllowedZone ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                    {showAllowedZone ? 'Ẩn vùng' : 'Hiện vùng'}
                  </Button>
                ) : null}
                {!allowedZone && onCreateAllowedZone && canEditAllowedZone ? (
                  <Button type="button" variant="outline" onClick={onCreateAllowedZone}>
                    <MapPinned className="mr-2 h-4 w-4" />
                    Tạo vùng cho phép
                  </Button>
                ) : null}
                {allowedZone && onEditAllowedZone && canEditAllowedZone ? (
                  <Button type="button" variant="outline" onClick={onEditAllowedZone}>
                    <MapPinned className="mr-2 h-4 w-4" />
                    Chỉnh vùng
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
              Thiết bị chưa gán phương tiện nên chưa thể quản lý vùng cho phép trên map.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
