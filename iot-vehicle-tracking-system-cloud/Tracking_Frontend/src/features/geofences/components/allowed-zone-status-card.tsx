'use client';

import { MapPinned, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVehicleAllowedZone } from '@/features/geofences/hooks/use-vehicle-allowed-zone';
import {
  describeBoundarySelections,
  formatAllowedZoneRadius,
  getZoneTypeLabel,
} from '@/features/geofences/lib/allowed-zone-form';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

const membershipMeta: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  inside: { label: 'Đang trong vùng', variant: 'default' },
  outside: { label: 'Đang ngoài vùng', variant: 'destructive' },
  suspect: { label: 'Sát mép vùng', variant: 'secondary' },
  unknown: { label: 'Chưa đánh giá', variant: 'outline' },
};

const alertModeLabel: Record<string, string> = {
  transition_only: 'Chỉ cảnh báo khi ra ngoài vùng',
  transition_and_recovery: 'Cảnh báo khi ra và khi quay lại',
  periodic_while_outside: 'Lặp lại khi còn ở ngoài vùng',
  silent: 'Im lặng',
};

const renderZoneSummary = (zone: NonNullable<ReturnType<typeof useVehicleAllowedZone>['zoneQuery']['data']>) => {
  if (zone.zoneType === 'administrative_boundary') {
    return describeBoundarySelections(zone.boundarySelections);
  }

  return formatAllowedZoneRadius(zone.radiusMeters);
};

export const AllowedZoneStatusCard = ({
  vehicleId,
  title = 'Vùng',
  onConfigure,
  canEdit = false,
}: {
  vehicleId?: string | null;
  title?: string;
  onConfigure?: () => void;
  canEdit?: boolean;
}) => {
  const { zoneQuery } = useVehicleAllowedZone(vehicleId);
  const zone = zoneQuery.data;
  const membership = membershipMeta[zone?.membershipState ?? 'unknown'] ?? membershipMeta.unknown;

  if (!vehicleId) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Chưa có phương tiện liên kết để cấu hình vùng hoạt động.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-background/80">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Mỗi xe chỉ có một vùng active tại một thời điểm.
            </p>
          </div>
          {onConfigure ? (
            <Button variant="outline" size="sm" disabled={!canEdit} onClick={onConfigure}>
              <MapPinned className="mr-2 h-4 w-4" />
              {zone ? 'Chỉnh vùng' : 'Thiết lập'}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {zoneQuery.isLoading ? (
          <p className="text-muted-foreground">Đang tải trạng thái vùng...</p>
        ) : null}

        {!zoneQuery.isLoading && !zone ? (
          <p className="text-muted-foreground">
            Chưa có vùng hoạt động cho phương tiện này.
          </p>
        ) : null}

        {zone ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant={membership.variant}>{membership.label}</Badge>
              <Badge variant="outline">{getZoneTypeLabel(zone.zoneType)}</Badge>
              <Badge variant="secondary">{alertModeLabel[zone.alertMode] ?? zone.alertMode}</Badge>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cấu hình</p>
                <p className="font-medium">{renderZoneSummary(zone)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cập nhật gần nhất</p>
                <p className="font-medium">
                  {formatDateTime(zone.updatedAt)} · {formatRelative(zone.updatedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Lần đổi trạng thái</p>
                <p className="font-medium">{formatDateTime(zone.lastMembershipChangedAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cảnh báo gần nhất</p>
                <p className="font-medium">{formatDateTime(zone.lastAlertedAt)}</p>
              </div>
            </div>

            {zone.zoneType === 'circle' &&
            zone.circleCenterLatitude !== null &&
            zone.circleCenterLongitude !== null ? (
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tâm vùng</p>
                <p className="font-medium">
                  {zone.circleCenterLatitude.toFixed(6)}, {zone.circleCenterLongitude.toFixed(6)}
                </p>
              </div>
            ) : null}

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
