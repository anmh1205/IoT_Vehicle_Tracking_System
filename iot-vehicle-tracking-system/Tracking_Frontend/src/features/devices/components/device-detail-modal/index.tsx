'use client';
import { useState } from 'react';
import { Download, MoreVertical, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRoleAccess } from '@/hooks/use-role-access';
import { DEVICE_STATUS_LABELS } from '@/features/devices/components/device-constants';
import type { DeviceDetailTab } from '@/features/devices/components/device-constants';
import { ExportModal } from '@/features/devices/components/export-modal';
import { DeviceDetailSkeleton } from '@/features/devices/components/device-skeletons';
import { ErrorBox } from '@/features/devices/components/error-box';
import { DeviceDetailModalProvider, useDeviceDetailModal } from './modal-context';
import { OverviewTab } from './overview-tab';
import { SessionsTab } from './sessions-tab';
import { ErrorCodesTab } from './error-codes-tab';
import { RuntimeTab } from './runtime-tab';
import { VibrationTab } from './vibration-tab';
import { SettingsTab } from './settings-tab';
const DeviceDetailModalContent = () => {
  const [exportOpen, setExportOpen] = useState(false);
  const { device, loading, error, activeTab, onTabChange, openExportModal } =
    useDeviceDetailModal();
  const access = useRoleAccess();
  if (loading) {
    return <DeviceDetailSkeleton />;
  }
  if (error) {
    return <ErrorBox description={error.message} />;
  }
  const vibrationTabVisible = access.canViewSystemInfo;
  const settingsTabVisible = access.canEditDevice;
  return (
    <div className="space-y-4">
      <DialogHeader className="border-b pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <DialogTitle className="text-xl">
              {device?.deviceName ?? 'Chi tiết thiết bị'}
            </DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {device?.deviceId ?? '-'} -{' '}
              {DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? '-'}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  openExportModal();
                  setExportOpen(true);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Xuất dữ liệu thiết bị
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setExportOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                Xuất theo khoảng thời gian
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onTabChange('overview')}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Làm mới
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </DialogHeader>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as DeviceDetailTab)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 gap-1 sm:grid-cols-6">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="sessions">Phiên chạy</TabsTrigger>
          <TabsTrigger value="errors">Mã lỗi</TabsTrigger>
          <TabsTrigger value="runtime">Runtime</TabsTrigger>
          {vibrationTabVisible ? <TabsTrigger value="vibration">Biểu đồ rung</TabsTrigger> : null}
          {settingsTabVisible ? <TabsTrigger value="settings">Cài đặt</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="errors">
          <ErrorCodesTab />
        </TabsContent>
        <TabsContent value="runtime">
          <RuntimeTab />
        </TabsContent>
        {vibrationTabVisible ? (
          <TabsContent value="vibration">
            <VibrationTab />
          </TabsContent>
        ) : null}
        {settingsTabVisible ? (
          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        ) : null}
      </Tabs>

      <ExportModal open={exportOpen} onOpenChange={setExportOpen} deviceId={device?.deviceId} />
    </div>
  );
};
export const DeviceDetailModal = ({
  open,
  onOpenChange,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: React.ComponentProps<typeof DeviceDetailModalProvider>['value'];
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[90vh] w-[95vw] max-w-[1200px] overflow-y-auto">
        <DeviceDetailModalProvider value={context}>
          <DeviceDetailModalContent />
        </DeviceDetailModalProvider>
      </DialogContent>
    </Dialog>
  );
};
