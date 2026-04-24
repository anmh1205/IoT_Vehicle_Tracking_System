'use client';

import { CarFront, Eye, EyeOff, LoaderCircle, MapPinned, X } from 'lucide-react';
import type { VehicleAllowedZone } from '@/lib/api/geofences';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatAllowedZoneRadius } from '@/features/geofences/lib/allowed-zone-form';
import { useMapInspectShortcuts } from '@/features/map/hooks/use-map-inspect-shortcuts';
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

const membershipMeta: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
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

const ShortcutButton = ({
  onClick,
  icon,
  label,
  disabled = false,
  loading = false,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <Button type="button" size="sm" variant="outline" disabled={disabled || loading} className="h-8 rounded-full px-3 text-xs" onClick={onClick}>
    {loading ? <LoaderCircle className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : icon}
    {label}
  </Button>
);

const StateChip = ({ label, value, tone }: { label: string; value: string; tone: StateTone }) => (
  <div className={cn('rounded-xl border px-3 py-2', toneClassNames[tone])}>
    <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">{label}</p>
    <p className="mt-1 text-sm font-semibold">{value}</p>
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
  className?: string;
}) => {
  const { shortcuts } = useMapInspectShortcuts(device, allowedZone);

  if (!device) {
    return null;
  }

  const freshness = getFreshnessPresentation(device.stateUpdatedAt ?? device.timestamp);
  const engine = getEnginePresentation(device.ignitionState);
  const motion = getMotionPresentation(device.motionState);
  const runtime = getDeviceRuntimePresentation(device.deviceState);
  const deviceAlerts = getAlertSummaryPresentation(device.deviceAlerts, 'Thiết bị');
  const ecuAlerts = getAlertSummaryPresentation(device.ecuAlerts, 'ECU');
  const allowedZoneMembership =
    membershipMeta[allowedZone?.membershipState ?? 'unknown'] ?? membershipMeta.unknown;
  const shortcutMap = new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut]));

  return (
    <div className={cn('pointer-events-none absolute inset-x-2 bottom-0 top-[4.5rem] z-[910] flex items-end pb-[max(0.35rem,var(--safe-area-bottom))] md:hidden', className)}>
      <div className="pointer-events-auto w-full rounded-2xl border border-border/70 bg-background/95 shadow-2xl backdrop-blur-md">
        <div className="grid gap-3 px-3 py-3">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CarFront className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="line-clamp-1 text-sm font-semibold leading-tight">{device.vehiclePlate ?? device.deviceName}</p>
                  <Badge variant="outline" className={cn('text-[11px]', toneClassNames[freshness.tone])}>
                    {freshness.label}
                  </Badge>
                </div>
                <p className="line-clamp-1 text-xs text-muted-foreground">
                  {device.deviceName} · {device.deviceId}
                  {device.customerName ? ` · ${device.customerName}` : ''}
                </p>
              </div>
              <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0 rounded-full border border-border/70 bg-background/90" onClick={onClose} aria-label="Ẩn thông tin thiết bị">
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <StateChip {...engine} />
              <StateChip {...motion} />
              <StateChip {...runtime} />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Cập nhật</p>
                <p className="mt-1 text-sm font-semibold">{device.timestamp ? formatRelative(device.timestamp) : '--'}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Thiết bị</p>
                <p className="mt-1 text-sm font-semibold">{deviceAlerts.summary}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ECU</p>
                <p className="mt-1 text-sm font-semibold">{ecuAlerts.summary}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-background/75 px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="mr-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Đi nhanh</p>
                {['overview', 'vehicle', 'alerts', 'errors', 'allowed-zone', 'geofence'].map((shortcutId) => {
                  const shortcut = shortcutMap.get(shortcutId);
                  if (!shortcut) {
                    return null;
                  }

                  return (
                    <ShortcutButton
                      key={shortcut.id}
                      onClick={shortcut.onSelect}
                      label={shortcut.label}
                      icon={<shortcut.icon className="h-3.5 w-3.5" aria-hidden="true" />}
                      disabled={shortcut.disabled}
                      loading={shortcut.loading}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-background/75 px-3 py-2">
            {allowedZoneLoading ? <Badge variant="outline">Đang tải vùng...</Badge> : null}
            {!allowedZoneLoading ? <Badge variant={allowedZone ? 'secondary' : 'outline'}>{allowedZone ? 'Đã cấu hình vùng' : 'Chưa có vùng'}</Badge> : null}
            {allowedZone ? (
              <>
                <Badge variant={allowedZoneMembership.variant}>{allowedZoneMembership.label}</Badge>
                <Badge variant="outline">{formatAllowedZoneRadius(allowedZone.radiusMeters)}</Badge>
              </>
            ) : null}

            {allowedZone && onToggleAllowedZoneVisibility ? (
              <Button type="button" size="sm" variant="outline" className="ml-auto h-8 rounded-full px-3 text-xs" onClick={onToggleAllowedZoneVisibility}>
                {showAllowedZone ? <EyeOff className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> : <Eye className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />}
                {showAllowedZone ? 'Ẩn vùng' : 'Hiện vùng'}
              </Button>
            ) : null}
            {!allowedZone && onCreateAllowedZone && canEditAllowedZone ? (
              <Button type="button" size="sm" variant="outline" className="ml-auto h-8 rounded-full px-3 text-xs" onClick={onCreateAllowedZone}>
                <MapPinned className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Tạo vùng
              </Button>
            ) : null}
            {allowedZone && onEditAllowedZone && canEditAllowedZone ? (
              <Button type="button" size="sm" variant="outline" className="ml-auto h-8 rounded-full px-3 text-xs" onClick={onEditAllowedZone}>
                <MapPinned className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                Chỉnh vùng
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
