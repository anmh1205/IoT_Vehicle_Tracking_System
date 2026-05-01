'use client';

import { useState } from 'react';
import { Download, Info, MoreVertical, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogHeader } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEVICE_STATUS_LABELS, DEVICE_STATUS_VARIANTS, type DeviceDetailTab } from '@/features/devices/components/device-constants';
import { ErrorBox } from '@/features/devices/components/error-box';
import { ExportModal } from '@/features/devices/components/export-modal';
import { DeviceDetailSkeleton } from '@/features/devices/components/device-skeletons';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRoleAccess } from '@/hooks/use-role-access';
import { formatRelative } from '@/lib/utils/date/format';
import { CommandsTab } from './commands-tab';
import { getDeviceConfigSummary } from './device-detail-presenters';
import { ErrorCodesTab } from './error-codes-tab';
import { OverviewTab } from './overview-tab';
import { RawDataTab } from './raw-data-tab';
import { RouteTab } from './route-tab';
import { SettingsTab } from './settings-tab';
import { getFreshnessSeconds, getTelemetryFreshnessState } from './telemetry-insights';
import { useDeviceDetailModal } from './modal-context';

const TELEMETRY_STATE_META = {
  healthy: { label: 'Đúng chu kỳ', description: 'Thiết bị đang gửi dữ liệu gần sát chu kỳ đã cấu hình.', variant: 'default' as const },
  warning: { label: 'Hơi chậm', description: 'Thiết bị vẫn đang gửi nhưng nhịp thực tế chậm hơn mức mong đợi.', variant: 'secondary' as const },
  stale: { label: 'Trễ rõ rệt', description: 'Dữ liệu đo từ xa đã cũ, nên kiểm tra lại kết nối hoặc tín hiệu GPS.', variant: 'outline' as const },
  offline: { label: 'Mất tín hiệu', description: 'Thiết bị đang vượt ngưỡng mất tín hiệu theo cấu hình hiện tại.', variant: 'destructive' as const },
  unknown: { label: 'Chưa đủ dữ liệu', description: 'Chưa có đủ mốc thời gian để đánh giá nhịp gửi hiện tại.', variant: 'outline' as const },
};

export const DeviceDetailDialogBody = () => {
  const [exportOpen, setExportOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { device, loading, error, activeTab, onTabChange, onRefresh, openExportModal, latestTrackingRow, positionSnapshot } = useDeviceDetailModal();
  const access = useRoleAccess();
  const isMobile = useIsMobile();

  if (loading) return <DeviceDetailSkeleton />;
  if (error) return <ErrorBox description={error.message} />;

  const settingsTabVisible = access.canEditDevice;
  const configSummary = getDeviceConfigSummary(device);
  const latestTelemetryTimestamp = latestTrackingRow?.timestamp ?? positionSnapshot?.timestamp ?? device?.lastSeenAt ?? null;
  const telemetryFreshness = getFreshnessSeconds(latestTelemetryTimestamp);
  const telemetryState = TELEMETRY_STATE_META[getTelemetryFreshnessState(telemetryFreshness, configSummary.activeIntervalSec)];
  const tabOptions: Array<{ value: DeviceDetailTab; label: string }> = [
    { value: 'overview', label: 'Tổng quan' },
    { value: 'route', label: 'Lộ trình' },
    { value: 'errors', label: 'Mã lỗi' },
    { value: 'commands', label: 'Lệnh' },
    { value: 'raw', label: 'Dữ liệu thô' },
    ...(settingsTabVisible ? [{ value: 'settings' as const, label: 'Cài đặt' }] : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="space-y-3 border-b bg-background px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-xl font-semibold">{device?.deviceName ?? 'Chi tiết thiết bị'}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{device?.deviceId ?? '-'}</span>
              <Badge variant={DEVICE_STATUS_VARIANTS[device?.currentStatus ?? ''] ?? 'outline'} className="font-medium">
                {DEVICE_STATUS_LABELS[device?.currentStatus ?? ''] ?? device?.currentStatus ?? '-'}
              </Badge>
              <Badge variant={telemetryState.variant}>{telemetryState.label}</Badge>
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground transition-colors hover:text-foreground" aria-label="Thông tin trạng thái dữ liệu đo từ xa">
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8} className="max-w-[320px] text-xs leading-relaxed">
                    {telemetryState.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span>Cập nhật {formatRelative(device?.lastSeenAt ?? null)}</span>
              {device?.vehiclePlate ? <span>Biển số {device.vehiclePlate}</span> : null}
              {device?.customerName ? <span>Khách hàng {device.customerName}</span> : null}
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="outline" aria-label="Thao tác thiết bị">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => { openExportModal(); setExportOpen(true); }}>
                  <Download className="mr-2 h-4 w-4" />
                  Xuất dữ liệu thiết bị
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setExportOpen(true)}>
                  <Download className="mr-2 h-4 w-4" />
                  Xuất theo khoảng thời gian
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isRefreshing} onClick={async () => { setIsRefreshing(true); try { await onRefresh(); } finally { setIsRefreshing(false); } }}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isRefreshing ? 'Đang làm mới...' : 'Làm mới dữ liệu'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DialogClose asChild>
              <Button size="icon" variant="outline" aria-label="Đóng chi tiết thiết bị">×</Button>
            </DialogClose>
          </div>
        </div>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as DeviceDetailTab)} className="flex min-h-0 flex-1 flex-col">
        <div className="border-b px-5 py-2.5">
          {isMobile ? (
            <Select value={activeTab} onValueChange={(value) => onTabChange(value as DeviceDetailTab)}>
              <SelectTrigger className="h-11 w-full rounded-full">
                <SelectValue placeholder="Chọn phần hiển thị" />
              </SelectTrigger>
              <SelectContent>{tabOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
          ) : (
            <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-none bg-transparent p-0 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {tabOptions.map((option) => <TabsTrigger key={option.value} value={option.value} className="h-9 flex-none rounded-full border bg-muted/60 px-3 text-xs data-[state=active]:border-primary/30 data-[state=active]:bg-primary/10 sm:text-sm">{option.label}</TabsTrigger>)}
            </TabsList>
          )}
        </div>

        <TabsContent value="overview" className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4"><OverviewTab /></TabsContent>
        <TabsContent value="route" className="mt-0 min-h-0 flex-1 overflow-hidden px-5 py-4"><RouteTab /></TabsContent>
        <TabsContent value="errors" className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4"><ErrorCodesTab /></TabsContent>
        <TabsContent value="commands" className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4"><CommandsTab /></TabsContent>
        <TabsContent value="raw" className="mt-0 min-h-0 flex-1 overflow-hidden px-5 py-4"><RawDataTab /></TabsContent>
        {settingsTabVisible ? <TabsContent value="settings" className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 py-4"><SettingsTab /></TabsContent> : null}
      </Tabs>

      <ExportModal open={exportOpen} onOpenChange={setExportOpen} deviceId={device?.deviceId} />
    </div>
  );
};
