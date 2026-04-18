'use client';

import { useState } from 'react';
import { Download, MoreVertical, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { CommandsTab } from './commands-tab';
import { ErrorCodesTab } from './error-codes-tab';
import { DeviceDetailModalProvider, useDeviceDetailModal } from './modal-context';
import { OverviewTab } from './overview-tab';
import { RawDataTab } from './raw-data-tab';
import { RouteTab } from './route-tab';
import { SettingsTab } from './settings-tab';
import {
  formatCoordinateLabel,
  formatSecondsLabel,
  getFreshnessSeconds,
  getObservedCadenceSeconds,
  getTelemetryFreshnessState,
} from './telemetry-insights';

const TELEMETRY_STATE_META = {
  healthy: {
    label: 'Đúng chu kỳ',
    description: 'Bản tin đang về gần sát chu kỳ cấu hình.',
    variant: 'default' as const,
  },
  warning: {
    label: 'Hơi chậm',
    description: 'Thiết bị vẫn gửi nhưng nhịp thực tế đang chậm hơn mong đợi.',
    variant: 'secondary' as const,
  },
  stale: {
    label: 'Trễ rõ rệt',
    description: 'Telemetry đã cũ, nên kiểm tra kết nối hoặc tín hiệu GPS.',
    variant: 'outline' as const,
  },
  offline: {
    label: 'Mất tín hiệu',
    description: 'Thiết bị vượt xa ngưỡng chấp nhận theo chu kỳ cấu hình.',
    variant: 'destructive' as const,
  },
  unknown: {
    label: 'Chưa đủ dữ liệu',
    description: 'Chưa có đủ mốc thời gian để đánh giá nhịp gửi.',
    variant: 'outline' as const,
  },
};

const DeviceDetailModalContent = () => {
  const [exportOpen, setExportOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const {
    device,
    loading,
    error,
    activeTab,
    onTabChange,
    onRefresh,
    openExportModal,
    latestTrackingRow,
    positionSnapshot,
    trackingRowsAscending,
  } = useDeviceDetailModal();
  const access = useRoleAccess();

  if (loading) {
    return <DeviceDetailSkeleton />;
  }

  if (error) {
    return <ErrorBox description={error.message} />;
  }

  const settingsTabVisible = access.canEditDevice;
  const configuredCadence = device?.requestInterval ?? 60;
  const observedCadence = getObservedCadenceSeconds(trackingRowsAscending);
  const latestTelemetryTimestamp =
    latestTrackingRow?.timestamp ?? positionSnapshot?.timestamp ?? device?.lastSeenAt ?? null;
  const telemetryFreshness = getFreshnessSeconds(latestTelemetryTimestamp);
  const telemetryState = TELEMETRY_STATE_META[
    getTelemetryFreshnessState(telemetryFreshness, configuredCadence)
  ];
  const metadata = [
    { label: 'IMEI', value: device?.imei ?? '-' },
    { label: 'Firmware', value: device?.firmwareVersion ?? '-' },
    { label: 'Chu kỳ gửi đã cấu hình', value: formatSecondsLabel(configuredCadence) },
    { label: 'Khoảng gửi thực tế', value: formatSecondsLabel(observedCadence) },
    { label: 'Bản tin mới nhất cách đây', value: formatSecondsLabel(telemetryFreshness) },
    {
      label: 'Tọa độ gần nhất',
      value: formatCoordinateLabel(
        latestTrackingRow?.latitude ?? positionSnapshot?.latitude ?? device?.latitude,
        latestTrackingRow?.longitude ?? positionSnapshot?.longitude ?? device?.longitude,
      ),
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="space-y-3 border-b bg-background px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-xl font-semibold">{device?.deviceName ?? 'Chi tiết thiết bị'}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{device?.deviceId ?? '-'}</span>
              <Badge
                variant={DEVICE_STATUS_VARIANTS[device?.currentStatus ?? ''] ?? 'outline'}
                className="font-medium"
              >
                {DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? '-'}
              </Badge>
              <Badge variant={telemetryState.variant}>{telemetryState.label}</Badge>
              <span>Cập nhật {formatRelative(device?.lastSeenAt ?? null)}</span>
              {device?.vehiclePlate ? <span>Biển số {device.vehiclePlate}</span> : null}
            </div>
            <p className="text-sm text-muted-foreground">{telemetryState.description}</p>
          </div>

          <div className="shrink-0">
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
        </div>

        <div className="grid grid-cols-2 gap-2 xl:grid-cols-6">
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
          <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger
              value="overview"
              className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
            >
              Tổng quan
            </TabsTrigger>
            <TabsTrigger
              value="route"
              className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
            >
              Lộ trình
            </TabsTrigger>
            <TabsTrigger
              value="errors"
              className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
            >
              Mã lỗi
            </TabsTrigger>
            <TabsTrigger
              value="commands"
              className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
            >
              Lệnh
            </TabsTrigger>
            <TabsTrigger
              value="raw"
              className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm"
            >
              Dữ liệu thô
            </TabsTrigger>
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
        <TabsContent value="route" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <RouteTab />
        </TabsContent>
        <TabsContent value="errors" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <ErrorCodesTab />
        </TabsContent>
        <TabsContent value="commands" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <CommandsTab />
        </TabsContent>
        <TabsContent value="raw" className="mt-0 min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <RawDataTab />
        </TabsContent>
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
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col overflow-hidden rounded-none border-0 p-0 sm:h-[92dvh] sm:max-h-[92dvh] sm:w-[min(97vw,1440px)] sm:max-w-none sm:rounded-2xl sm:border">
        <DialogTitle className="sr-only">{context.device?.deviceName ?? 'Chi tiết thiết bị'}</DialogTitle>
        <DialogDescription className="sr-only">
          Bảng chi tiết thiết bị tracking gồm tổng quan, bản đồ lộ trình, phiên chạy, lỗi, lệnh và dữ liệu thô.
        </DialogDescription>
        <DeviceDetailModalProvider value={context}>
          <DeviceDetailModalContent />
        </DeviceDetailModalProvider>
      </DialogContent>
    </Dialog>
  );
};


