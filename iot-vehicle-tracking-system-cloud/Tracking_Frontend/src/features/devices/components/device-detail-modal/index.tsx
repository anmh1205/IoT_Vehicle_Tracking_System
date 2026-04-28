'use client';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DeviceDetailModalProvider } from './modal-context';
import { DeviceDetailDialogBody } from './dialog-body';
import { DeviceWorkspaceShell } from './workspace-shell';
import type { DeviceDetailModalPresentation, DeviceWorkspaceActions, DeviceWorkspaceFallbackPaths } from './workspace-types';
import type { MapInspectPanelPayload, MapInspectPanelTarget } from '@/features/map/types';

export const DeviceDetailModal = ({
  open,
  onOpenChange,
  context,
  fallbackPaths,
  launchPayload,
  launchRequestKey = 0,
  launchTarget = 'overview',
  presentation = 'dialog',
  workspaceActions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: React.ComponentProps<typeof DeviceDetailModalProvider>['value'];
  fallbackPaths?: DeviceWorkspaceFallbackPaths;
  launchPayload?: MapInspectPanelPayload | null;
  launchRequestKey?: number;
  launchTarget?: MapInspectPanelTarget;
  presentation?: DeviceDetailModalPresentation;
  workspaceActions?: DeviceWorkspaceActions;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DeviceDetailModalProvider value={context}>
        {presentation === 'workspace' ? (
          <DeviceWorkspaceShell
            fallbackPaths={fallbackPaths ?? { alertsPath: null, deviceDetailPath: null, geofencesPath: '/dashboard/zones', vehicleDetailPath: null }}
            launchPayload={launchPayload}
            launchRequestKey={launchRequestKey}
            launchTarget={launchTarget}
            onOpenChange={onOpenChange}
            workspaceActions={workspaceActions}
          />
        ) : (
          <DialogContent
            showCloseButton={false}
            className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 p-0 sm:h-[98dvh] sm:max-h-[98dvh] sm:w-[min(99vw,1720px)] sm:max-w-none sm:rounded-2xl sm:border"
          >
            <DialogTitle className="sr-only">{context.device?.deviceName ?? 'Chi tiết thiết bị'}</DialogTitle>
            <DialogDescription className="sr-only">
              Bảng chi tiết thiết bị tracking gồm tổng quan, bản đồ lộ trình, phiên chạy, lỗi, lệnh và dữ liệu thô.
            </DialogDescription>
            <DeviceDetailDialogBody />
          </DialogContent>
        )}
      </DeviceDetailModalProvider>
    </Dialog>
  );
};
