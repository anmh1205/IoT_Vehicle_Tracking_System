'use client';

import { MapPinned, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';
import { useVehicleAllowedZone } from '@/features/geofences/hooks/use-vehicle-allowed-zone';

const membershipMeta: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  inside: { label: 'Đang trong vùng', variant: 'default' },
  outside: { label: 'Đang ngoài vùng', variant: 'destructive' },
  suspect: { label: 'Sát mép vùng', variant: 'secondary' },
  unknown: { label: 'Chưa đánh giá', variant: 'outline' },
};

const alertModeLabel: Record<string, string> = {
  transition_only: 'Chỉ cảnh báo khi vượt ra',
  transition_and_recovery: 'Cảnh báo khi ra và khi quay lại',
  periodic_while_outside: 'Lặp lại khi còn ở ngoài vùng',
  silent: 'Im lặng',
};

export const AllowedZoneStatusCard = ({
  vehicleId,
  title = 'Vùng cho phép',
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
          <p className="text-sm text-muted-foreground">Chưa có phương tiện liên kết để thiết lập vùng cho phép.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">Một phương tiện chỉ có một vùng hoạt động tại một thời điểm.</p>
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
        {zoneQuery.isLoading ? <p className="text-muted-foreground">Đang tải trạng thái vùng cho phép...</p> : null}
        {!zoneQuery.isLoading && !zone ? (
          <p className="text-muted-foreground">Chưa có vùng cho phép hoạt động cho phương tiện này.</p>
        ) : null}
        {zone ? (
          <>
            <div className="flex flex-wrap gap-2">
              <Badge variant={membership.variant}>{membership.label}</Badge>
              <Badge variant="outline">{Math.round(zone.radiusMeters)} m</Badge>
              <Badge variant="secondary">{alertModeLabel[zone.alertMode] ?? zone.alertMode}</Badge>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Tâm vùng</p>
                <p className="font-medium">{zone.centerLatitude.toFixed(6)}, {zone.centerLongitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cập nhật gần nhất</p>
                <p className="font-medium">{formatDateTime(zone.updatedAt)} · {formatRelative(zone.updatedAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Lần đổi trạng thái</p>
                <p className="font-medium">{formatDateTime(zone.lastMembershipChangedAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Cooldown</p>
                <p className="font-medium">{zone.cooldownSec}s</p>
              </div>
            </div>
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
