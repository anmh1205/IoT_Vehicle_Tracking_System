'use client';

import {
  CarFront,
  Eye,
  EyeOff,
  LoaderCircle,
  MapPinned,
  PanelRightClose,
  PanelRightOpen,
  X,
} from 'lucide-react';
import type { VehicleZone } from '@/lib/api/zones';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  describeBoundarySelections,
  formatAllowedZoneRadius,
  getZoneTypeLabel,
} from '@/features/geofences/lib/allowed-zone-form';
import { useMapInspectShortcuts } from '@/features/map/hooks/use-map-inspect-shortcuts';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition } from '@/features/map/types';
import { formatRelative } from '@/lib/utils/date/format';
import {
  getFreshnessPresentation,
  getMotionPresentation,
  getDeviceRuntimePresentation,
  getEnginePresentation,
} from '@/lib/utils/device-state';
import { cn } from '@/lib/utils';

const membershipMeta: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  inside: { label: 'Đang trong vùng', variant: 'default' },
  outside: { label: 'Đang ngoài vùng', variant: 'destructive' },
  suspect: { label: 'Sát mép vùng', variant: 'secondary' },
  unknown: { label: 'Chưa đánh giá', variant: 'outline' },
};

const toneClasses = {
  neutral: 'border-border/70 bg-muted/40 text-foreground',
  info: 'border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warn: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
} as const;

const MiniStat = ({ label, value, tone }: { label: string; value: string; tone: keyof typeof toneClasses }) => (
  <div className={cn('rounded-2xl border px-3 py-2', toneClasses[tone])}>
    <p className="text-[10px] uppercase tracking-[0.16em] opacity-70">{label}</p>
    <p className="mt-1 text-sm font-semibold">{value}</p>
  </div>
);

const formatCoordinateValue = (lat: number | null | undefined, lon: number | null | undefined) =>
  Number.isFinite(lat) && Number.isFinite(lon) ? `${lat!.toFixed(5)}, ${lon!.toFixed(5)}` : '--';

const formatSpeedValue = (speed: number | null | undefined) =>
  Number.isFinite(speed) ? `${speed!.toFixed(1)} km/h` : '--';

const formatElectricalValue = (value: number | null | undefined) => {
  if (!Number.isFinite(value) || value! <= 0) {
    return '--';
  }

  return value! > 24 ? `${value!.toFixed(0)}%` : `${value!.toFixed(1)} V`;
};

const formatTemperatureValue = (value: number | null | undefined) =>
  Number.isFinite(value) ? `${value!.toFixed(1)}°C` : '--';

export const MapInspectRail = ({
  device,
  allowedZone,
  allowedZoneLoading = false,
  showAllowedZone = false,
  canEditAllowedZone = false,
  onClose,
  onCreateAllowedZone,
  onEditAllowedZone,
  onToggleAllowedZoneVisibility,
}: {
  device: DevicePosition | null;
  allowedZone?: VehicleZone | null;
  allowedZoneLoading?: boolean;
  showAllowedZone?: boolean;
  canEditAllowedZone?: boolean;
  onClose: () => void;
  onCreateAllowedZone?: () => void;
  onEditAllowedZone?: () => void;
  onToggleAllowedZoneVisibility?: () => void;
}) => {
  const collapsed = useMapStore((state) => state.inspectRailCollapsed);
  const toggleCollapsed = useMapStore((state) => state.toggleInspectRailCollapsed);
  const { shortcuts } = useMapInspectShortcuts(device, allowedZone);

  if (!device) {
    return null;
  }

  const freshness = getFreshnessPresentation(device.stateUpdatedAt ?? device.timestamp);
  const engine = getEnginePresentation(device.ignitionState);
  const motion = getMotionPresentation(device.motionState);
  const runtime = getDeviceRuntimePresentation(device.deviceState);
  const allowedZoneMembership =
    membershipMeta[allowedZone?.membershipState ?? 'unknown'] ?? membershipMeta.unknown;
  const quickStats = [
    { label: 'Tốc độ', value: formatSpeedValue(device.speed) },
    { label: 'Tọa độ', value: formatCoordinateValue(device.lat, device.lon) },
    { label: 'Ắc quy xe', value: formatElectricalValue(device.vehicleBattery ?? device.battery) },
    {
      label: 'Nhiệt độ máy',
      value: formatTemperatureValue(device.engineTemperature ?? device.temperature),
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-[910] hidden md:flex">
      <TooltipProvider delayDuration={120}>
        <aside
          className={cn(
            'pointer-events-auto flex h-full flex-col border-l border-border/70 bg-background/92 px-3 py-3 shadow-2xl backdrop-blur-xl transition-[width] duration-200',
            collapsed ? 'w-20' : 'w-[23rem]',
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className={cn('min-w-0 flex-1', collapsed && 'sr-only')}>
              <p className="truncate text-sm font-semibold">{device.vehiclePlate ?? device.deviceName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {device.deviceName} · {device.deviceId}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-2xl" onClick={toggleCollapsed} aria-label={collapsed ? 'Mở rộng thanh tác vụ' : 'Thu gọn thanh tác vụ'}>
                {collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-2xl" onClick={onClose} aria-label="Bỏ chọn thiết bị">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
            {!collapsed ? (
              <>
                <div className="rounded-3xl border border-border/70 bg-background/80 p-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <CarFront className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{device.vehiclePlate ?? device.deviceName}</p>
                        <Badge variant="outline" className={cn('text-[11px]', toneClasses[freshness.tone])}>
                          {freshness.label}
                        </Badge>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        Cập nhật {device.timestamp ? formatRelative(device.timestamp) : '--'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2">
                    <MiniStat label={engine.label} value={engine.value} tone={engine.tone} />
                    <MiniStat label={motion.label} value={motion.value} tone={motion.tone} />
                    <MiniStat label={runtime.label} value={runtime.value} tone={runtime.tone} />
                  </div>
                </div>

                <div className="rounded-3xl border border-border/70 bg-background/80 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Thông số nhanh
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {quickStats.map((stat) => (
                      <MiniStat
                        key={stat.label}
                        label={stat.label}
                        value={stat.value}
                        tone="neutral"
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-border/70 bg-background/80 p-3">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Vùng</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={allowedZone ? 'secondary' : 'outline'}>{allowedZone ? 'Đã cấu hình' : 'Chưa có'}</Badge>
                    {allowedZoneLoading ? <Badge variant="outline">Đang tải...</Badge> : null}
                    {allowedZone ? (
                      <>
                        <Badge variant={allowedZoneMembership.variant}>{allowedZoneMembership.label}</Badge>
                        <Badge variant="outline">{getZoneTypeLabel(allowedZone.zoneType)}</Badge>
                        <Badge variant="outline">
                          {allowedZone.zoneType === 'administrative_boundary'
                            ? describeBoundarySelections(allowedZone.boundarySelections)
                            : formatAllowedZoneRadius(allowedZone.radiusMeters)}
                        </Badge>
                      </>
                    ) : null}
                  </div>
                </div>
              </>
            ) : null}

            <div className="grid gap-2">
              {shortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                const button = (
                  <Button
                    key={shortcut.id}
                    type="button"
                    variant="outline"
                    className={cn('h-11 justify-start rounded-2xl border-border/70 bg-background/70 px-3', collapsed && 'justify-center px-0')}
                    disabled={shortcut.disabled || shortcut.loading}
                    onClick={shortcut.onSelect}
                    aria-label={shortcut.label}
                  >
                    {shortcut.loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
                    {!collapsed ? <span className="ml-2 truncate text-sm">{shortcut.label}</span> : null}
                    {!collapsed && shortcut.badge ? <Badge className="ml-auto min-w-6 justify-center rounded-full px-1.5">{shortcut.badge}</Badge> : null}
                  </Button>
                );

                return collapsed ? (
                  <Tooltip key={shortcut.id}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="left">{shortcut.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  button
                );
              })}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {onToggleAllowedZoneVisibility && allowedZone ? (
              <Button type="button" variant="outline" className={cn('h-11 rounded-2xl', collapsed && 'px-0')} onClick={onToggleAllowedZoneVisibility} aria-label={showAllowedZone ? 'Ẩn vùng' : 'Hiện vùng'}>
                {showAllowedZone ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {!collapsed ? <span className="ml-2">{showAllowedZone ? 'Ẩn vùng' : 'Hiện vùng'}</span> : null}
              </Button>
            ) : null}
            {!allowedZone && onCreateAllowedZone && canEditAllowedZone ? (
              <Button type="button" variant="outline" className={cn('h-11 rounded-2xl', collapsed && 'px-0')} onClick={onCreateAllowedZone} aria-label="Tạo vùng">
                <MapPinned className="h-4 w-4" />
                {!collapsed ? <span className="ml-2">Tạo vùng</span> : null}
              </Button>
            ) : null}
            {allowedZone && onEditAllowedZone && canEditAllowedZone ? (
              <Button type="button" variant="outline" className={cn('h-11 rounded-2xl', collapsed && 'px-0')} onClick={onEditAllowedZone} aria-label="Chỉnh vùng">
                <MapPinned className="h-4 w-4" />
                {!collapsed ? <span className="ml-2">Chỉnh vùng</span> : null}
              </Button>
            ) : null}
          </div>
        </aside>
      </TooltipProvider>
    </div>
  );
};
