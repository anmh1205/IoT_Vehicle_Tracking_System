'use client';

import Link from 'next/link';
import { ArrowUpRight, MapPinned, Orbit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AllowedZoneStatusCard } from '@/features/geofences/components/allowed-zone-status-card';
import { useRoleAccess } from '@/hooks/use-role-access';
import { useDeviceDetailModal } from './modal-context';
import type { DeviceWorkspaceActions } from './workspace-types';

const highlightClasses: Record<string, string> = {
  'allowed-zone-status': 'ring-2 ring-primary/30',
  'allowed-zone-empty': 'ring-2 ring-amber-500/30',
  'geofence-context': 'ring-2 ring-sky-500/30',
};

export const WorkspaceZonesSection = ({
  geofencesPath,
  highlight,
  workspaceActions,
}: {
  geofencesPath: string;
  highlight: string | null;
  workspaceActions?: DeviceWorkspaceActions;
}) => {
  const access = useRoleAccess();
  const { device, linkedVehicle, deviceScopedAlerts } = useDeviceDetailModal();
  const geofenceAlerts = deviceScopedAlerts.filter((alert) => (alert.alertType ?? '').startsWith('geofence'));

  return (
    <div className="space-y-4">
      <div className={highlight ? highlightClasses[highlight] ?? '' : ''}>
        <AllowedZoneStatusCard
          vehicleId={device?.vehicleId ?? null}
          title="Vùng cho phép đang áp dụng"
          canEdit={access.canEditDevice && Boolean(device?.vehicleId)}
          onConfigure={workspaceActions?.onEnterAllowedZoneEdit}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/70 bg-background/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPinned className="h-4 w-4" />
              Context vùng cho phép
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm leading-6 text-muted-foreground">
              {linkedVehicle
                ? `Thiết bị đang gắn với xe ${linkedVehicle.plateNumber ?? linkedVehicle.vehicleId ?? 'chưa định danh'}. Có thể chỉnh vùng cho phép ngay từ workspace này hoặc mở lại bản đồ để đặt tâm trực tiếp.`
                : 'Thiết bị chưa gắn phương tiện nên chưa thể cấu hình vùng cho phép từ workspace này.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {workspaceActions?.onEnterAllowedZoneEdit ? (
                <Button onClick={workspaceActions.onEnterAllowedZoneEdit} disabled={!device?.vehicleId}>
                  Chỉnh vùng trên bản đồ
                </Button>
              ) : null}
              <Button asChild variant="outline">
                <Link href={geofencesPath}>
                  Mở trang geofence đầy đủ
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className={highlight === 'geofence-context' ? 'border-sky-500/40 bg-sky-500/5' : 'border-border/70 bg-background/80'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Orbit className="h-4 w-4" />
              Geofence liên quan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {geofenceAlerts.length > 0 ? (
              geofenceAlerts.slice(0, 4).map((alert) => (
                <div key={alert.id} className="rounded-2xl border bg-muted/15 px-3 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{alert.alertType ?? 'geofence'}</Badge>
                    <Badge variant={alert.status === 'active' ? 'default' : 'outline'}>{alert.status ?? 'unknown'}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-medium">{alert.displayTitle ?? alert.title ?? `Cảnh báo #${alert.id}`}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{alert.displayMessage ?? alert.message ?? 'Không có mô tả chi tiết.'}</p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Chưa có cảnh báo geofence active nào gắn với thiết bị này. Nếu cần quản lý danh sách vùng giám sát, dùng workspace geofence hoặc mở trang chi tiết đầy đủ.
              </p>
            )}

            {workspaceActions?.onEnterGeofenceEdit ? (
              <Button variant="outline" onClick={workspaceActions.onEnterGeofenceEdit}>
                Mở workspace geofence trên bản đồ
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
