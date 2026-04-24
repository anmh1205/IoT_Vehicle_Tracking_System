'use client';

import Link from 'next/link';
import { ArrowUpRight, CarFront } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { CommandsTab } from './commands-tab';
import { ErrorCodesTab } from './error-codes-tab';
import { OverviewTab } from './overview-tab';
import { RawDataTab } from './raw-data-tab';
import { RouteTab } from './route-tab';
import { RuntimeTab } from './runtime-tab';
import { SettingsTab } from './settings-tab';
import { useDeviceDetailModal } from './modal-context';
import { WorkspaceAlertsSection } from './workspace-alerts-section';
import { WorkspaceZonesSection } from './workspace-zones-section';
import type { DeviceWorkspaceActions, DeviceWorkspaceFallbackPaths, DeviceWorkspaceSection } from './workspace-types';
import { VehicleDetailContent } from '@/features/vehicles/components/vehicle-detail-content';

const MissingVehicleState = ({ vehicleDetailPath }: { vehicleDetailPath: string | null }) => (
  <div className="space-y-4">
    <EmptyState title="Thiết bị chưa có ngữ cảnh xe" description="Thiết bị hiện chưa map sang hồ sơ phương tiện nên workspace chưa thể hiển thị summary liên kết." />
    {vehicleDetailPath ? (
      <Button asChild variant="outline">
        <Link href={vehicleDetailPath}>
          Mở hồ sơ xe đầy đủ
          <ArrowUpRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    ) : null}
  </div>
);

export const DeviceWorkspaceCanvas = ({
  activeSection,
  fallbackPaths,
  highlight,
  workspaceActions,
}: {
  activeSection: DeviceWorkspaceSection;
  fallbackPaths: DeviceWorkspaceFallbackPaths;
  highlight: string | null;
  workspaceActions?: DeviceWorkspaceActions;
}) => {
  const { linkedVehicle, linkedVehicleLoading } = useDeviceDetailModal();

  switch (activeSection) {
    case 'vehicle':
      if (linkedVehicleLoading) {
        return <div className="rounded-3xl border border-border/70 bg-background/70 px-4 py-6 text-sm text-muted-foreground">Đang tải hồ sơ phương tiện liên kết...</div>;
      }

      return linkedVehicle ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CarFront className="h-4 w-4" />
            Dữ liệu xe liên kết được render trong cùng workspace, không rời khỏi bản đồ.
          </div>
          <VehicleDetailContent vehicle={linkedVehicle} compact />
        </div>
      ) : (
        <MissingVehicleState vehicleDetailPath={fallbackPaths.vehicleDetailPath} />
      );
    case 'alerts':
      return <WorkspaceAlertsSection alertsPath={fallbackPaths.alertsPath} />;
    case 'errors':
      return <ErrorCodesTab />;
    case 'runtime':
      return <RuntimeTab />;
    case 'route':
      return <div className="h-full overflow-hidden"><RouteTab /></div>;
    case 'commands':
      return <CommandsTab />;
    case 'raw':
      return <div className="h-full overflow-hidden"><RawDataTab /></div>;
    case 'zones':
      return <WorkspaceZonesSection geofencesPath={fallbackPaths.geofencesPath} highlight={highlight} workspaceActions={workspaceActions} />;
    case 'settings':
      return <SettingsTab />;
    case 'overview':
    default:
      return <OverviewTab />;
  }
};
