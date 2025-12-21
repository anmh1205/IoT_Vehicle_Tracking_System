'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailTab, RuntimeRange, STATUS_LABEL, STATUS_VARIANT, VibPeriod } from '../device-constants';
import { ErrorBox } from '../ErrorBox';
import { ListSkeleton } from '../DeviceSkeletons';
import { DeviceDetailOverviewTab } from './DeviceDetailOverviewTab';
import { DeviceDetailSessionsTab } from './DeviceDetailSessionsTab';
import { DeviceDetailErrorCodesTab } from './DeviceDetailErrorCodesTab';
import { DeviceDetailSettingsTab } from './DeviceDetailSettingsTab';
import { DeviceRuntimeChart } from '../DeviceRuntimeChart';
import { DeviceVibrationChart } from '../DeviceVibrationChart';
import { ExportModal } from '../ExportModal';
import { deviceDetailServices } from '@/lib/api/deviceDetail';
import { exportServices } from '@/lib/api/export';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { useRealtimeContext } from '@/components/providers/RealtimeProvider';
import type { DeviceStatusEventPayload, DeviceSessionDeltaEventPayload } from '@/lib/realtime/events';
import { useCreateExport } from '@/hooks/mutations/useCreateExport';
import { useDeviceStatusRealtime } from '@/hooks/useDeviceStatusRealtime';
import { Bolt, PauseCircle, WifiOff, Download, MoreVertical, Database, AlertCircle } from 'lucide-react';
import { DEVICE_GRADIENTS, DEVICE_SHADOWS, DEVICE_RADIUS, DEVICE_ANIMATIONS } from '../device-design-constants';

export function DeviceDetailModal({
  open,
  onClose,
  detail,
  loading,
  error,
  sessions,
  sessionsLoading,
  sessionsLoadingMore,
  sessionsError,
  sessionsHasMore,
  onSessionsLoadMore,
  errorCodes,
  errorCodesLoading,
  errorCodesError,
  errorCodesPage,
  errorCodesStatus,
  errorCodesType,
  onErrorCodesPageChange,
  onErrorCodesStatusChange,
  onErrorCodesTypeChange,
  runtimeChart,
  runtimeChartLoading,
  runtimeChartError,
  runtimeRange,
  onRuntimeRangeChange,
  vibrationChart,
  vibrationChartLoading,
  vibrationChartError,
  vibrationPeriod,
  onVibrationPeriodChange,
  onUpdateNameId,
  onUpdateSettings,
  onDeleteDevice,
  activeTab,
  onTabChange
}: {
  open: boolean;
  onClose: () => void;
  detail:
    | {
        device: Device.DeviceDetail;
        runtimeStats?: Device.RuntimeStats | null;
        realtimeData?: Device.RealtimeData | null;
      }
    | undefined;
  loading: boolean;
  error: Error | null;
  sessions: any[];
  sessionsLoading: boolean;
  sessionsLoadingMore: boolean;
  sessionsError: Error | null;
  sessionsHasMore: boolean;
  onSessionsLoadMore: () => void;
  errorCodes: any;
  errorCodesLoading: boolean;
  errorCodesError: Error | null;
  errorCodesPage: number;
  errorCodesStatus: string;
  errorCodesType: string;
  onErrorCodesPageChange: (page: number) => void;
  onErrorCodesStatusChange: (status: string) => void;
  onErrorCodesTypeChange: (type: string) => void;
  runtimeChart: any;
  runtimeChartLoading: boolean;
  runtimeChartError: Error | null;
  runtimeRange: RuntimeRange;
  onRuntimeRangeChange: (r: RuntimeRange) => void;
  vibrationChart: any;
  vibrationChartLoading: boolean;
  vibrationChartError: Error | null;
  vibrationPeriod: VibPeriod;
  onVibrationPeriodChange: (p: VibPeriod) => void;
  onUpdateNameId: (deviceId: string, updates: { device_name?: string; device_id?: string }) => Promise<void>;
  onUpdateSettings: (
    deviceId: string,
    settings: { vibration_threshold?: number | null; request_interval?: number | null }
  ) => Promise<void>;
  onDeleteDevice: (d: { device_id: string; device_name?: string | null }) => Promise<void> | void;
  activeTab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
}) {
  const deviceInfo = detail?.device;
  const runtimeStats = detail?.runtimeStats ?? null;
  const realtimeData = detail?.realtimeData ?? null;
  
  // Use useDeviceStatusRealtime to derive status correctly (same as DeviceCard)
  const lastHeartbeat = realtimeData?.last_heartbeat ?? deviceInfo?.last_seen_at ?? null;
  const { status: derivedStatus } = useDeviceStatusRealtime({
    last_seen_at: lastHeartbeat,
    request_interval: deviceInfo?.request_interval ?? null,
    current_status: realtimeData?.current_status ?? deviceInfo?.current_status ?? null
  });
  const status = derivedStatus ?? 'stopped';
  
  // Local state for realtime updates
  const [localRealtimeData, setLocalRealtimeData] = useState<Device.RealtimeData | null>(realtimeData ?? null);
  const [localRuntimeStats, setLocalRuntimeStats] = useState<Device.RuntimeStats | null>(runtimeStats ?? null);
  
  // Sync with props when they change (merge to keep existing fields)
  useEffect(() => {
    if (realtimeData) {
      setLocalRealtimeData((prev) => ({
        ...realtimeData,
        // Keep fields from prev that might not be in new realtimeData
        temperature: realtimeData.temperature ?? prev?.temperature ?? null,
        signal_strength: realtimeData.signal_strength ?? prev?.signal_strength ?? null,
      }));
    }
  }, [realtimeData]);
  
  useEffect(() => {
    if (runtimeStats) {
      setLocalRuntimeStats((prev) => ({
        ...runtimeStats,
        // Keep latest_session from prev if not in new runtimeStats
        latest_session: runtimeStats.latest_session ?? prev?.latest_session ?? null,
      }));
    }
  }, [runtimeStats]);
  
  const [exportOpen, setExportOpen] = useState(false);
  const queryClient = useQueryClient();
  const { joinDeviceRoom, leaveDeviceRoom } = useRealtimeContext();
  const createExport = useCreateExport();

  const handleExport = async (
    period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom',
    startDate?: string,
    endDate?: string
  ) => {
    if (!deviceInfo?.device_id) return;
    await deviceDetailServices.exportSessions(deviceInfo.device_id, 'csv', period, startDate, endDate);
  };

  const handleExportAll = async () => {
    if (!deviceInfo?.device_id) return;
    try {
      await exportServices.createExport({
        page: 'device-detail',
        tabs: ['sessions', 'error-codes'],
        deviceId: deviceInfo.device_id
      });
      // Notification is handled by exportServices.createExport
    } catch (err) {
      console.error('Export failed:', err);
      // Error notification is handled by exportServices.createExport
    }
  };

  const handleExportSessions = async () => {
    if (!deviceInfo?.device_id) return;
    try {
      const config: Export.ExportConfigInput = {
        page: 'device-detail',
        tab: 'sessions',
        deviceId: deviceInfo.device_id,
        asyncPreferred: false
      };
      await createExport.mutateAsync(config);
    } catch (err) {
      console.error('Export sessions failed:', err);
    }
  };

  const handleExportErrorCodes = async () => {
    if (!deviceInfo?.device_id) return;
    try {
      const config: Export.ExportConfigInput = {
        page: 'device-detail',
        tab: 'error-codes',
        deviceId: deviceInfo.device_id,
        filters: { status: errorCodesStatus, type: errorCodesType },
        asyncPreferred: false
      };
      await createExport.mutateAsync(config);
    } catch (err) {
      console.error('Export error codes failed:', err);
    }
  };

  // Realtime subscriptions: status + sessions
  useRealtimeSubscription<DeviceStatusEventPayload>({
    namespace: 'devices',
    event: 'device.status.changed',
    enabled: open && !!deviceInfo?.device_id,
    handler: (payload) => {
      if (payload.device_id !== deviceInfo?.device_id) return;
      
      // Update local realtime data from payload
      if (payload.realtime_metrics) {
        const metrics = payload.realtime_metrics;
        setLocalRealtimeData((prev) => ({
          ...(prev || {}),
          current_status: payload.status ?? prev?.current_status ?? null,
          last_heartbeat: payload.last_seen_at ?? prev?.last_heartbeat ?? null,
          vibration_level: metrics.vibration_value ?? prev?.vibration_level ?? null,
          battery_top: metrics.battery_top ?? prev?.battery_top ?? null,
          battery_bot: metrics.battery_bot ?? prev?.battery_bot ?? null,
          // Keep existing temperature and signal_strength if not in payload
          temperature: prev?.temperature ?? null,
          signal_strength: prev?.signal_strength ?? null,
        }));
      } else {
        // Update status and last_seen_at even without realtime_metrics
        setLocalRealtimeData((prev) => {
          if (!prev) {
            return {
              current_status: payload.status ?? null,
              last_heartbeat: payload.last_seen_at ?? null,
              vibration_level: null,
              battery_top: null,
              battery_bot: null,
              temperature: null,
              signal_strength: null,
            };
          }
          return {
            ...prev,
            current_status: payload.status ?? prev.current_status ?? null,
            last_heartbeat: payload.last_seen_at ?? prev.last_heartbeat ?? null,
          };
        });
      }
      
      // Update runtime stats from payload
      if (payload.runtime_stats) {
        const stats = payload.runtime_stats;
        setLocalRuntimeStats((prev) => ({
          ...(prev || {}),
          today: stats.today ?? prev?.today ?? 0,
          week: stats.week ?? prev?.week ?? 0,
          month: stats.month ?? prev?.month ?? 0,
          quarter: stats.quarter ?? prev?.quarter ?? 0,
          year: stats.year ?? prev?.year ?? 0,
          total: stats.total ?? prev?.total ?? 0,
          efficiency: prev?.efficiency ?? 0,
          avg_session_duration: prev?.avg_session_duration ?? 0,
          // Keep existing latest_session if not in payload
          latest_session: prev?.latest_session ?? null,
        }));
      }
      
      // Still invalidate queries for other data that needs refetch
      queryClient.invalidateQueries({ queryKey: ['device', deviceInfo.device_id, 'detail'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceInfo.device_id, 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceInfo.device_id, 'runtime-chart'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceInfo.device_id, 'vibration-chart'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceInfo.device_id, 'error-codes'] });
    }
  });

  useRealtimeSubscription<DeviceSessionDeltaEventPayload>({
    namespace: 'devices',
    event: 'device.sessions.updated',
    enabled: open && !!deviceInfo?.device_id,
    handler: (payload) => {
      if (payload.device_id !== deviceInfo?.device_id) return;
      queryClient.invalidateQueries({ queryKey: ['device', deviceInfo.device_id, 'sessions'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceInfo.device_id, 'detail'] });
    }
  });

  // Join/leave realtime room like legacy modal
  useEffect(() => {
    if (open && deviceInfo?.device_id) {
      joinDeviceRoom(deviceInfo.device_id);
    }
    return () => {
      if (deviceInfo?.device_id) {
        leaveDeviceRoom(deviceInfo.device_id);
      }
    };
  }, [open, deviceInfo?.device_id, joinDeviceRoom, leaveDeviceRoom]);

  const getStatusIcon = () => {
    if (status === 'running') return <Bolt className='h-6 w-6 text-white' />;
    if (status === 'disconnected') return <WifiOff className='h-6 w-6 text-white' />;
    return <PauseCircle className='h-6 w-6 text-white' />;
  };

  const getStatusGradient = () => {
    if (status === 'running') return DEVICE_GRADIENTS.status.running;
    if (status === 'disconnected') return DEVICE_GRADIENTS.status.disconnected;
    return DEVICE_GRADIENTS.status.stopped;
  };

  const getStatusBadgeMeta = () => {
    // More prominent status badge (works in both light and dark themes)
    if (status === 'running') {
      return {
        icon: <Bolt className='h-4 w-4' />,
        className:
          'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-sm'
      };
    }
    if (status === 'disconnected') {
      return {
        icon: <WifiOff className='h-4 w-4' />,
        className:
          'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm'
      };
    }
    return {
      icon: <PauseCircle className='h-4 w-4' />,
      className:
        'border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive shadow-sm'
    };
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className='w-[90vw] max-w-[90vw] sm:max-w-[90vw] h-[90vh] max-h-[90vh] flex flex-col overflow-hidden p-6'>
        <DialogHeader className='flex-shrink-0 pb-6 border-b border-border'>
          <DialogTitle className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
            <div className='flex items-center gap-4'>
              <div
                className={`flex h-16 w-16 items-center justify-center ${DEVICE_RADIUS.icon} ${getStatusGradient()} ${DEVICE_SHADOWS.icon} ${DEVICE_ANIMATIONS.transition.colors} shadow-lg`}
              >
                {getStatusIcon()}
              </div>
              <div className='flex flex-col'>
                <div className='flex items-center gap-3 flex-wrap'>
                  <span className='text-2xl font-bold text-foreground'>{deviceInfo?.device_name ?? 'Thiết bị'}</span>
                  <Badge
                    variant='outline'
                    className={`text-sm font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-2 ${getStatusBadgeMeta().className}`}
                  >
                    {getStatusBadgeMeta().icon}
                    {STATUS_LABEL[status] ?? 'Không xác định'}
                  </Badge>
                </div>
                <span className='text-sm font-mono text-muted-foreground mt-1'>ID: {deviceInfo?.device_id}</span>
              </div>
            </div>
            <div className='flex items-center gap-3 flex-wrap'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm' className='gap-2'>
                    <Download className='h-4 w-4' />
                    <span className='hidden sm:inline'>Xuất dữ liệu</span>
                    <MoreVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem onClick={handleExportAll}>
                    <Download className='mr-2 h-4 w-4' />
                    Tải toàn bộ thông tin
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExportOpen(true)}>
                    <Download className='mr-2 h-4 w-4' />
                    Xuất CSV theo thời gian
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportSessions} disabled={createExport.isPending}>
                    <Database className='mr-2 h-4 w-4' />
                    Xuất phiên chạy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportErrorCodes} disabled={createExport.isPending}>
                    <AlertCircle className='mr-2 h-4 w-4' />
                    Xuất mã lỗi
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className='mt-6 flex flex-1 min-h-0 flex-col'>
          {error ? (
            <div className='flex-1 min-h-0 overflow-y-auto'>
              <ErrorBox message={error.message} />
            </div>
          ) : loading || !detail ? (
            <div className='flex-1 min-h-0 overflow-y-auto'>
              <DetailSkeleton />
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => onTabChange(v as DetailTab)}
              className='flex flex-1 min-h-0 flex-col'
            >
              <TabsList className='flex-shrink-0 flex flex-wrap gap-2 bg-muted/50 p-1.5 h-auto'>
              <TabsTrigger
                value='overview'
                className='data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-200 px-4 py-2 uppercase'
              >
                Tổng quan
              </TabsTrigger>
              <TabsTrigger
                value='sessions'
                className='data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-200 px-4 py-2 uppercase'
              >
                Phiên chạy
              </TabsTrigger>
              <TabsTrigger
                value='errors'
                className='data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-200 px-4 py-2 uppercase'
              >
                Mã lỗi
              </TabsTrigger>
              <TabsTrigger
                value='runtime'
                className='data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-200 px-4 py-2 uppercase'
              >
                Biểu đồ thời gian
              </TabsTrigger>
              <TabsTrigger
                value='vibration'
                className='data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-200 px-4 py-2 uppercase'
              >
                Biểu đồ rung
              </TabsTrigger>
              <TabsTrigger
                value='settings'
                className='data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:font-semibold transition-all duration-200 px-4 py-2 uppercase'
              >
                Cài đặt
              </TabsTrigger>
            </TabsList>
            <TabsContent value='overview' className='flex-1 min-h-0 overflow-y-auto mt-0 space-y-6 pt-4'>
              {deviceInfo && (
                <DeviceDetailOverviewTab
                  detail={{
                    device: deviceInfo,
                    runtimeStats: localRuntimeStats ?? runtimeStats,
                    realtimeData: localRealtimeData ?? realtimeData
                  }}
                />
              )}
            </TabsContent>
            <TabsContent value='sessions' className='flex-1 min-h-0 overflow-y-auto mt-0 space-y-4 pt-4'>
              {sessionsError ? (
                <ErrorBox message={sessionsError.message} />
              ) : sessionsLoading ? (
                <ListSkeleton />
              ) : (
                <DeviceDetailSessionsTab
                  sessions={sessions || []}
                  hasMore={sessionsHasMore}
                  loadingMore={sessionsLoadingMore}
                  onLoadMore={onSessionsLoadMore}
                  deviceId={deviceInfo!.device_id}
                  currentStatus={derivedStatus ?? (localRealtimeData?.current_status ?? deviceInfo!.current_status)}
                  lastSeenAt={localRealtimeData?.last_heartbeat ?? deviceInfo!.last_seen_at}
                />
              )}
            </TabsContent>
            <TabsContent value='errors' className='flex-1 min-h-0 overflow-y-auto mt-0 space-y-4 pt-4'>
              {errorCodesError ? (
                <ErrorBox message={errorCodesError.message} />
              ) : errorCodesLoading ? (
                <ListSkeleton />
              ) : (
                <>
                  <div className='text-sm font-medium'>Mã lỗi</div>
                  <DeviceDetailErrorCodesTab
                    errorCodes={errorCodes?.errorCodes || []}
                    pagination={errorCodes?.pagination}
                    status={errorCodesStatus}
                    type={errorCodesType}
                    onPageChange={onErrorCodesPageChange}
                    onStatusChange={onErrorCodesStatusChange}
                    onTypeChange={onErrorCodesTypeChange}
                  />
                </>
              )}
            </TabsContent>
            <TabsContent value='runtime' className='flex-1 min-h-0 overflow-y-auto mt-0 space-y-4 pt-4'>
              {runtimeChartError ? (
                <ErrorBox message={runtimeChartError.message} />
              ) : (
                <DeviceRuntimeChart
                  loading={runtimeChartLoading}
                  series={runtimeChart?.seconds || []}
                  labels={runtimeChart?.labels || []}
                  range={runtimeRange}
                  onChangeRange={onRuntimeRangeChange}
                  formatHours={(seconds?: number) => {
                    if (!seconds) return '00:00:00';
                    const h = Math.floor(seconds / 3600);
                    const m = Math.floor((seconds % 3600) / 60);
                    const s = seconds % 60;
                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                  }}
                />
              )}
            </TabsContent>
            <TabsContent value='vibration' className='flex-1 min-h-0 overflow-y-auto mt-0 space-y-4 pt-4'>
              {vibrationChartError ? (
                <ErrorBox message={vibrationChartError.message} />
              ) : (
                <DeviceVibrationChart
                  loading={vibrationChartLoading}
                  series={vibrationChart?.values || []}
                  labels={vibrationChart?.labels || []}
                  period={vibrationPeriod}
                  onChangePeriod={onVibrationPeriodChange}
                  threshold={deviceInfo!.vibration_threshold ?? null}
                />
              )}
            </TabsContent>
            <TabsContent value='settings' className='flex-1 min-h-0 overflow-y-auto mt-0 space-y-4 pt-4'>
              <DeviceDetailSettingsTab
                detail={deviceInfo!}
                onUpdateNameId={onUpdateNameId}
                onUpdateSettings={onUpdateSettings}
                onDelete={() => onDeleteDevice({ device_id: deviceInfo!.device_id, device_name: deviceInfo!.device_name })}
              />
            </TabsContent>
            </Tabs>
          )}
        </div>
        <ExportModal
          open={exportOpen}
          onClose={() => setExportOpen(false)}
          deviceName={deviceInfo?.device_name ?? 'Thiết bị'}
          onExport={handleExport}
        />
      </DialogContent>
    </Dialog>
  );
}

function DetailSkeleton() {
  return (
    <div className='space-y-3'>
      <Skeleton className='h-4 w-1/3' />
      <Skeleton className='h-4 w-1/2' />
      <Skeleton className='h-16 w-full' />
      <Skeleton className='h-24 w-full' />
    </div>
  );
}

// Re-export tabs for convenience
export { DeviceDetailOverviewTab } from './DeviceDetailOverviewTab';
export { DeviceDetailSessionsTab } from './DeviceDetailSessionsTab';
export { DeviceDetailErrorCodesTab } from './DeviceDetailErrorCodesTab';
export { DeviceDetailSettingsTab } from './DeviceDetailSettingsTab';

