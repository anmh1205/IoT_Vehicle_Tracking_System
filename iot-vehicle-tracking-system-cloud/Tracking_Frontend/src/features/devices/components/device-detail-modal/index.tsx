'use client';

import { useState } from 'react';
import { Download, MoreVertical, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DEVICE_STATUS_LABELS,
  DEVICE_STATUS_VARIANTS,
  type DeviceDetailTab,
} from '@/features/devices/components/device-constants';
import { ErrorBox } from '@/features/devices/components/error-box';
import { ExportModal } from '@/features/devices/components/export-modal';
import { DeviceDetailSkeleton } from '@/features/devices/components/device-skeletons';
import { useRoleAccess } from '@/hooks/use-role-access';
import { formatRelative } from '@/lib/utils/date/format';
import { DeviceDetailModalProvider, useDeviceDetailModal } from './modal-context';
import { ErrorCodesTab } from './error-codes-tab';
import { OverviewTab } from './overview-tab';
import { RuntimeTab } from './runtime-tab';
import { SessionsTab } from './sessions-tab';
import { SettingsTab } from './settings-tab';
import { VibrationTab } from './vibration-tab';

const DeviceDetailModalContent = () => {
  const [exportOpen, setExportOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { device, loading, error, activeTab, onTabChange, onRefresh, openExportModal } =
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
  const metadata = [
    { label: 'IMEI', value: device?.imei ?? '-' },
    { label: 'Firmware', value: device?.firmwareVersion ?? '-' },
    { label: 'Chu kỳ gửi', value: `${device?.requestInterval ?? 60}s` },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="space-y-3 border-b bg-background px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <DialogTitle className="text-xl">
              {device?.deviceName ?? 'Chi tiết thiết bị'}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{device?.deviceId ?? '-'}</span>
              <Badge
                variant={DEVICE_STATUS_VARIANTS[device?.currentStatus ?? ''] ?? 'outline'}
                className="font-medium"
              >
                {DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? '-'}
              </Badge>
              <span>Cập nhật {formatRelative(device?.lastSeenAt ?? null)}</span>
              {device?.vehiclePlate ? <span>Biển số {device.vehiclePlate}</span> : null}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline" aria-label="Thao tác thiết bị">
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
              <DropdownMenuItem
                disabled={isRefreshing}
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await onRefresh();
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {isRefreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {metadata.map((item) => (
            <div key={item.label} className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {item.label}
              </p>
              <p className="mt-1 truncate text-sm font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </DialogHeader>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as DeviceDetailTab)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b px-6 py-3">
          <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0">
            <TabsTrigger
              value="overview"
              className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
            >
              Tổng quan
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
            >
              Phiên chạy
            </TabsTrigger>
            <TabsTrigger
              value="errors"
              className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
            >
              Mã lỗi
            </TabsTrigger>
            <TabsTrigger
              value="runtime"
              className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
            >
              Runtime
            </TabsTrigger>
            {vibrationTabVisible ? (
              <TabsTrigger
                value="vibration"
                className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
              >
                Biểu đồ rung
              </TabsTrigger>
            ) : null}
            {settingsTabVisible ? (
              <TabsTrigger
                value="settings"
                className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
              >
                Cài đặt
              </TabsTrigger>
            ) : null}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="sessions" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="errors" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <ErrorCodesTab />
        </TabsContent>
        <TabsContent value="runtime" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <RuntimeTab />
        </TabsContent>
        {vibrationTabVisible ? (
          <TabsContent value="vibration" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <VibrationTab />
          </TabsContent>
        ) : null}
        {settingsTabVisible ? (
          <TabsContent value="settings" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
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
      <DialogContent className="flex h-[92dvh] w-[min(96vw,1200px)] max-w-none flex-col overflow-hidden p-0 sm:rounded-2xl">
        <DeviceDetailModalProvider value={context}>
          <DeviceDetailModalContent />
        </DeviceDetailModalProvider>
      </DialogContent>
    </Dialog>
  );
};
