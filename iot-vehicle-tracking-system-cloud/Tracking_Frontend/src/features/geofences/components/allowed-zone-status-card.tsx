'use client';

import { Bell, Clock3, MapPinned, Radar, ShieldAlert, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useVehicleAllowedZone } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import type { VehicleZone } from '@/lib/api/zones';
import {
  describeBoundarySelections,
  formatAllowedZoneRadius,
  getZoneTypeLabel,
} from '@/features/geofences/lib/allowed-zone-form';
import { formatDateTime, formatDuration, formatRelative } from '@/lib/utils/date/format';

type AllowedZoneStatusCardProps = { vehicleId?: string | null; title?: string; onConfigure?: () => void; canEdit?: boolean; variant?: 'compact' | 'detail' };
type MembershipMeta = {
  label: string;
  description: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
};

const membershipMeta: Record<VehicleZone['membershipState'], MembershipMeta> = {
  inside: { label: 'Trong vùng', description: 'Vị trí mới nhất nằm trong vùng được phép.', variant: 'default', className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  outside: { label: 'Ngoài vùng', description: 'Vị trí mới nhất đã vượt vùng được phép.', variant: 'destructive', className: 'border-destructive/35 bg-destructive/10 text-destructive' },
  suspect: { label: 'Sát mép vùng', description: 'Vị trí đang ở gần ranh giới, cần theo dõi thêm.', variant: 'secondary', className: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  unknown: { label: 'Chưa đánh giá', description: 'Đã có cấu hình vùng, đang chờ bản tin vị trí để đánh giá.', variant: 'outline', className: 'border-border bg-muted/20 text-muted-foreground' },
};

const alertModeLabel: Record<string, string> = {
  transition_only: 'Chỉ cảnh báo khi ra ngoài vùng',
  transition_and_recovery: 'Cảnh báo khi ra và khi quay lại',
  periodic_while_outside: 'Lặp lại khi còn ở ngoài vùng',
  silent: 'Im lặng',
};

const alertTypeLabel: Record<string, string> = {
  zone_enter: 'Xe quay lại vùng',
  zone_exit: 'Xe ra ngoài vùng',
  zone_outside_periodic: 'Xe vẫn ngoài vùng',
};

const formatCooldown = (seconds: number | null | undefined) =>
  seconds && seconds > 0 ? formatDuration(seconds) : 'Không chờ';

const renderZoneSummary = (zone: VehicleZone) => {
  if (zone.zoneType === 'administrative_boundary') {
    return describeBoundarySelections(zone.boundarySelections);
  }

  return formatAllowedZoneRadius(zone.radiusMeters);
};

const renderZoneCenter = (zone: VehicleZone) =>
  zone.zoneType === 'circle' &&
  zone.circleCenterLatitude !== null &&
  zone.circleCenterLongitude !== null
    ? `${zone.circleCenterLatitude.toFixed(6)}, ${zone.circleCenterLongitude.toFixed(6)}`
    : '--';

const ZoneFact = ({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon?: LucideIcon;
  label: string;
  value: string;
  note?: string | null;
}) => (
  <div className="flex min-w-0 items-start gap-2 rounded-lg border bg-muted/10 px-3 py-2.5">
    {Icon ? <Icon className="mt-0.5 h-4 w-4 flex-none text-muted-foreground" /> : null}
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-foreground" title={value}>{value}</p>
      {note ? <p className="mt-1 truncate text-xs text-muted-foreground" title={note}>{note}</p> : null}
    </div>
  </div>
);

export const AllowedZoneStatusCard = ({
  vehicleId,
  title = 'Vùng',
  onConfigure,
  canEdit = false,
  variant = 'detail',
}: AllowedZoneStatusCardProps) => {
  const { zoneQuery } = useVehicleAllowedZone(vehicleId);
  const zone = zoneQuery.data;
  const membership = membershipMeta[zone?.membershipState ?? 'unknown'] ?? membershipMeta.unknown;
  const isCompact = variant === 'compact';

  return (
    <Card className="border-border/70 bg-background/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {vehicleId ? <p className="mt-1 truncate text-sm text-muted-foreground">Xe {vehicleId}</p> : null}
          </div>
          {onConfigure && vehicleId ? (
            <Button className="cursor-pointer" variant="outline" size="sm" disabled={!canEdit} onClick={onConfigure}>
              <MapPinned className="mr-2 h-4 w-4" />
              {zone ? 'Chỉnh vùng' : 'Thiết lập'}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!vehicleId ? (
          <p className="text-sm text-muted-foreground">Chưa có phương tiện liên kết để cấu hình vùng hoạt động.</p>
        ) : null}

        {vehicleId && zoneQuery.isLoading ? (
          <div className="space-y-2">
            <div className="h-4 w-44 animate-pulse rounded bg-muted" />
            <div className="h-16 animate-pulse rounded-lg bg-muted/60" />
          </div>
        ) : null}

        {vehicleId && !zoneQuery.isLoading && !zone ? (
          <div className="rounded-lg border border-dashed bg-muted/10 p-4">
            <div className="flex items-start gap-3">
              <MapPinned className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Chưa thiết lập vùng</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Thiết lập vùng trên bản đồ để hệ thống đánh giá trạng thái trong/ngoài vùng.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {zone ? (
          <>
            <div className={cn('rounded-xl border p-4', membership.className)}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={membership.variant}>{membership.label}</Badge>
                    <Badge variant="outline">{getZoneTypeLabel(zone.zoneType)}</Badge>
                  </div>
                  <p className="text-sm leading-6">{membership.description}</p>
                </div>
                <div className="min-w-[12rem] text-left lg:text-right">
                  <p className="text-[11px] uppercase tracking-[0.14em] opacity-75">Phạm vi</p>
                  <p className="mt-1 text-xl font-semibold">{renderZoneSummary(zone)}</p>
                </div>
              </div>
            </div>

            {isCompact ? (
              <div className="grid gap-2 md:grid-cols-2">
                <ZoneFact label="Tâm / địa giới" value={renderZoneCenter(zone)} />
                <ZoneFact icon={Clock3} label="Cập nhật" value={formatRelative(zone.updatedAt)} />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cấu hình vùng</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    <ZoneFact icon={MapPinned} label="Tâm / địa giới" value={renderZoneCenter(zone)} />
                    <ZoneFact icon={Bell} label="Cảnh báo" value={alertModeLabel[zone.alertMode] ?? zone.alertMode} />
                    <ZoneFact icon={SlidersHorizontal} label="Khoảng nghỉ" value={formatCooldown(zone.cooldownSec)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Nhật ký vùng</p>
                  <div className="grid gap-2 md:grid-cols-3">
                    <ZoneFact icon={Clock3} label="Cập nhật cấu hình" value={formatRelative(zone.updatedAt)} note={formatDateTime(zone.updatedAt)} />
                    <ZoneFact icon={Radar} label="Đổi trạng thái" value={formatDateTime(zone.lastMembershipChangedAt)} />
                    <ZoneFact icon={Bell} label="Cảnh báo gần nhất" value={formatDateTime(zone.lastAlertedAt)} note={zone.lastAlertedType ? alertTypeLabel[zone.lastAlertedType] ?? zone.lastAlertedType : null} />
                  </div>
                </div>
              </>
            )}

            {zone.warning ? (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription>{zone.warning.message}</AlertDescription>
              </Alert>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};
