'use client';

import type { ReactNode } from 'react';
import {
  Battery,
  CarFront,
  Clock3,
  Eye,
  EyeOff,
  Gauge,
  MapPinned,
  Thermometer,
  X,
} from 'lucide-react';
import type { VehicleAllowedZone } from '@/lib/api/geofences';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatAllowedZoneRadius } from '@/features/geofences/lib/allowed-zone-form';
import type { DevicePosition } from '@/features/map/types';
import { formatRelative } from '@/lib/utils/date/format';
import {
  getAlertSummaryPresentation,
  getDeviceRuntimePresentation,
  getEnginePresentation,
  getFreshnessPresentation,
  getMotionPresentation,
  type StateTone,
} from '@/lib/utils/device-state';
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

const toneClassNames: Record<StateTone, string> = {
  neutral: 'border-border/70 bg-muted/30 text-foreground',
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
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

const StateChip = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: StateTone;
}) => (
  <div className={`rounded-xl border px-3 py-2 ${toneClassNames[tone]}`}>
    <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">{label}</p>
    <p className="mt-1 text-sm font-semibold">{value}</p>
  </div>
);

const MetricCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) => (
  <div className="flex min-w-[118px] items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
      {icon}
    </span>
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  </div>
);

const AlertPill = ({
  label,
  summary,
  tone,
}: {
  label: string;
  summary: string;
  tone: StateTone;
}) => (
  <div className={`rounded-xl border px-3 py-2 ${toneClassNames[tone]}`}>
    <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">{label}</p>
    <p className="mt-1 text-sm font-medium">{summary}</p>
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

  const freshness = getFreshnessPresentation(device.stateUpdatedAt ?? device.timestamp);
  const engine = getEnginePresentation(device.ignitionState);
  const motion = getMotionPresentation(device.motionState);
  const runtime = getDeviceRuntimePresentation(device.deviceState);
  const deviceAlerts = getAlertSummaryPresentation(device.deviceAlerts, 'Thiết bị');
  const ecuAlerts = getAlertSummaryPresentation(device.ecuAlerts, 'ECU');
  const allowedZoneMembership = membershipMeta[allowedZone?.membershipState ?? 'unknown'] ?? membershipMeta.unknown;

  const metrics = [
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
      label: 'Cập nhật',
      value: device.timestamp ? formatRelative(device.timestamp) : 'Chưa có mốc',
      icon: <Clock3 className="h-4 w-4" />,
    },
  ];

  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-2 bottom-0 top-[4.5rem] z-[910] flex items-end pb-[max(0.35rem,var(--safe-area-bottom))] md:inset-x-3 md:top-auto',
        className,
      )}
    >
      <div
        className={cn(
          'pointer-events-auto max-h-full w-full overflow-y-auto rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-md',
          condensed && 'md:max-w-[880px]',
        )}
      >
        <div className="grid gap-3 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CarFront className="h-5 w-5" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="line-clamp-1 text-sm font-semibold">{device.vehiclePlate ?? device.deviceName}</p>
                <Badge variant="outline" className={toneClassNames[freshness.tone]}>
                  {freshness.label}
                </Badge>
              </div>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {device.deviceName} · {device.deviceId}
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

          <div className="grid gap-2 md:grid-cols-3">
            <StateChip {...engine} />
            <StateChip {...motion} />
            <StateChip {...runtime} />
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <AlertPill {...deviceAlerts} />
            <AlertPill {...ecuAlerts} />
            <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Vùng cho phép</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                {allowedZoneLoading ? <Badge variant="outline">Đang tải...</Badge> : null}
                {!allowedZoneLoading ? (
                  <Badge variant={allowedZone ? 'secondary' : 'outline'}>
                    {allowedZone ? 'Đã cấu hình' : 'Chưa thiết lập'}
                  </Badge>
                ) : null}
                {allowedZone ? (
                  <Badge variant={allowedZoneMembership.variant}>{allowedZoneMembership.label}</Badge>
                ) : null}
                {allowedZone ? (
                  <Badge variant="outline">{formatAllowedZoneRadius(allowedZone.radiusMeters)}</Badge>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-stretch gap-2">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                icon={metric.icon}
              />
            ))}
          </div>

          {device.vehicleId ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              {allowedZone && onToggleAllowedZoneVisibility ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg px-3 text-xs sm:text-sm"
                  onClick={onToggleAllowedZoneVisibility}
                >
                  {showAllowedZone ? (
                    <EyeOff className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {showAllowedZone ? 'Ẩn vùng' : 'Hiện vùng'}
                </Button>
              ) : null}
              {!allowedZone && onCreateAllowedZone && canEditAllowedZone ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg px-3 text-xs sm:text-sm"
                  onClick={onCreateAllowedZone}
                >
                  <MapPinned className="mr-1.5 h-3.5 w-3.5" />
                  Tạo vùng
                </Button>
              ) : null}
              {allowedZone && onEditAllowedZone && canEditAllowedZone ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-lg px-3 text-xs sm:text-sm"
                  onClick={onEditAllowedZone}
                >
                  <MapPinned className="mr-1.5 h-3.5 w-3.5" />
                  Chỉnh vùng
                </Button>
              ) : null}
              {allowedZone?.warning ? (
                <p className="ml-auto text-xs text-amber-700 dark:text-amber-300">
                  {allowedZone.warning.message}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
              Thiết bị chưa gắn phương tiện nên chưa thể quản lý vùng cho phép trên bản đồ.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
