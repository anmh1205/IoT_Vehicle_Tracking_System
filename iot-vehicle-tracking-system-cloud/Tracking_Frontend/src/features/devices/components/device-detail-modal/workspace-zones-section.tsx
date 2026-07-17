'use client';

import Link from 'next/link';
import { ArrowUpRight, MapPinned } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AllowedZoneStatusCard } from '@/features/geofences/components/allowed-zone-status-card';
import { useRoleAccess } from '@/hooks/use-role-access';
import { useDeviceDetailModal } from './modal-context';
import type { DeviceWorkspaceActions } from './workspace-types';

const highlightClasses: Record<string, string> = {
  'allowed-zone-status': 'ring-2 ring-primary/30',
  'allowed-zone-empty': 'ring-2 ring-amber-500/30',
  'geofence-context': 'ring-2 ring-sky-500/30',
  'zone-context': 'ring-2 ring-sky-500/30',
};

const normalizeZoneAlertCount = (alertType: string | null | undefined) => {
  const normalized = String(alertType ?? '').toLowerCase();
  return normalized.startsWith('zone_') || normalized.startsWith('geofence');
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
  const zoneAlertCount = deviceScopedAlerts.filter((alert) =>
    normalizeZoneAlertCount(alert.alertType),
  ).length;

  return (
    <div className="space-y-4">
      <div className={highlight ? highlightClasses[highlight] ?? '' : ''}>
        <AllowedZoneStatusCard
          vehicleId={device?.vehicleId ?? null}
          title="Vùng được phép"
          canEdit={access.canEditDevice && Boolean(device?.vehicleId)}
          onConfigure={workspaceActions?.onEnterAllowedZoneEdit}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/80 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <MapPinned className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline">
            {zoneAlertCount > 0 ? `${zoneAlertCount} cảnh báo vùng gần đây` : 'Không có cảnh báo vùng gần đây'}
          </Badge>
          {linkedVehicle ? (
            <Badge variant="secondary">{linkedVehicle.plateNumber ?? linkedVehicle.vehicleId}</Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {workspaceActions?.onEnterAllowedZoneEdit ? (
            <Button className="cursor-pointer" onClick={workspaceActions.onEnterAllowedZoneEdit} disabled={!device?.vehicleId}>
              Chỉnh vùng trên bản đồ
            </Button>
          ) : null}
          <Button asChild className="cursor-pointer" variant="outline">
            <Link href={geofencesPath}>
              Mở trang vùng
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
