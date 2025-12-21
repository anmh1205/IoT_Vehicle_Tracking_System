'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useMemo, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeviceDetail } from '@/hooks/queries/useDeviceDetail';
import { useDeviceErrorCodes } from '@/hooks/queries/useDeviceErrorCodes';
import { useDeviceList } from '@/hooks/queries/useDeviceList';
import { useDeviceRuntimeChart } from '@/hooks/queries/useDeviceRuntimeChart';
import { useDeviceVibrationChart } from '@/hooks/queries/useDeviceVibrationChart';
import { useInfiniteDeviceSessions } from '@/hooks/queries/useInfiniteDeviceSessions';
import { DeviceFilters } from './components/DeviceFilters';
import { DeviceGrid } from './components/DeviceGrid';
import { DeviceStatsBar } from './components/DeviceStatsBar';
import { ErrorBox } from './components/ErrorBox';
import { DeviceDetailModal } from './components/DeviceDetailModal';
import { DeviceCreateModal } from './components/DeviceCreateModal';
import { DeviceEditModal } from './components/DeviceEditModal';
import { RuntimeRange, DetailTab, VibPeriod } from './components/device-constants';
import { deviceServices } from '@/lib/api/device';
import { deviceDetailServices } from '@/lib/api/deviceDetail';
import { exportServices } from '@/lib/api/export';
import { http } from '@/lib/api/http';
import { groupSessionsByDate } from '@/lib/utils/chart/data';
import { STALE_TIMES } from '@/lib/constants/queryCache';
import { useInfiniteScrollSentinel } from '@/hooks/useInfiniteScrollSentinel';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import dayjs from 'dayjs';

export default function DevicePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'runtime'>('name');
  const [visibleCount, setVisibleCount] = useState(20);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState<Device.DeviceDto | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [errorCodesPage, setErrorCodesPage] = useState(1);
  const [errorCodesStatus, setErrorCodesStatus] = useState('all');
  const [errorCodesType, setErrorCodesType] = useState('all');
  const [runtimeRange, setRuntimeRange] = useState<RuntimeRange>(7);
  const [vibrationPeriod, setVibrationPeriod] = useState<VibPeriod>('sample');
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    device?: { device_id: string; device_name?: string | null };
  }>({ open: false });

  const { data: devices = [], isLoading, error } = useDeviceList(true);
  const [now, setNow] = useState(dayjs());

  // Update now every second for realtime stats calculation
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const { data: detail, isLoading: detailLoading, error: detailError } = useDeviceDetail(
    selectedId || '',
    !!selectedId
  );
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    isFetchingNextPage: sessionsLoadingMore,
    hasNextPage: sessionsHasMore,
    fetchNextPage: fetchNextSessionsPage,
    error: sessionsError
  } = useInfiniteDeviceSessions(selectedId || '', 20, activeTab === 'sessions');
  const {
    data: errorCodes,
    isLoading: errorCodesLoading,
    error: errorCodesError
  } = useDeviceErrorCodes(selectedId || '', errorCodesPage, 10, errorCodesStatus, errorCodesType, activeTab === 'errors');
  const {
    data: runtimeChart,
    isLoading: runtimeChartLoading,
    error: runtimeChartError
  } = useDeviceRuntimeChart(selectedId || '', runtimeRange, activeTab === 'runtime');
  const {
    data: vibrationChart,
    isLoading: vibrationChartLoading,
    error: vibrationChartError
  } = useDeviceVibrationChart(selectedId || '', vibrationPeriod, activeTab === 'vibration');

  // Pre-fetch all chart options for smooth animation when switching
  useEffect(() => {
    if (!selectedId) return;

    // Pre-fetch all runtime chart ranges
    const runtimeRanges: RuntimeRange[] = [7, 30, 90];
    runtimeRanges.forEach((range) => {
      if (range !== runtimeRange) {
        queryClient.prefetchQuery({
          queryKey: ['device', selectedId, 'runtime-chart', range],
          queryFn: async () => {
            const apiData = await http.get<{
              sessions: Array<{
                session_start: string;
                session_end: string | null;
                uptime: number | null;
              }>;
              startDate: string;
              endDate: string;
            }>(`/device/${selectedId}/runtime-chart?range=${range}`);

            const startDate = new Date(apiData.startDate);
            const endDate = new Date(apiData.endDate);

            const dailyRuntime = groupSessionsByDate(
              apiData.sessions.map((s) => ({
                session_start: s.session_start,
                session_end: s.session_end,
                uptime: s.uptime ?? undefined,
                total_runtime_seconds: s.uptime ?? undefined
              })),
              startDate,
              endDate
            );

            const labels = dailyRuntime.map((day) => {
              const date = new Date(day.date);
              const dayNum = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              return `${dayNum}/${month}/${year}`;
            });
            const seconds = dailyRuntime.map((day) => day.seconds);

            return {
              days: range,
              labels,
              seconds
            };
          },
          staleTime: STALE_TIMES.DEVICE_RUNTIME_CHART
        });
      }
    });

    // Pre-fetch all vibration chart periods
    const vibrationPeriods: VibPeriod[] = ['sample', 'minute', 'hour', 'day'];
    vibrationPeriods.forEach((period) => {
      if (period !== vibrationPeriod) {
        queryClient.prefetchQuery({
          queryKey: ['device', selectedId, 'vibration-chart', period],
          queryFn: async () => {
            const apiData = await http.get<{
              period: string;
              series: Array<{
                id: string;
                label: string;
                points: Array<{ x: string; y: number }>;
              }>;
            }>(`/device/${selectedId}/vibration-chart?period=${period}`);

            const firstSeries = apiData.series?.[0];
            const points = firstSeries?.points ?? [];

            const labels = points.map((p) => p.x);
            const values = points.map((p) => p.y ?? 0);

            return {
              period: (apiData.period as VibPeriod) ?? period,
              labels,
              values
            };
          },
          staleTime: STALE_TIMES.DEVICE_VIBRATION_CHART
        });
      }
    });
  }, [selectedId, runtimeRange, vibrationPeriod, queryClient]);

  /**
   * Calculate realtime device status based on last_seen_at and request_interval
   * Logic: timeout = (request_interval / 1000) + 10 seconds
   * If elapsed > timeout and status was 'running', mark as 'disconnected'
   */
  const getRealtimeStatus = (device: Device.DeviceDto): Device.DeviceDto['current_status'] => {
    const OFFLINE_BUFFER_SECONDS = 10;
    const intervalMs = device.request_interval ?? 2000; // Default 2 seconds if null
    const intervalSeconds = intervalMs / 1000;
    const timeoutSeconds = intervalSeconds + OFFLINE_BUFFER_SECONDS;

    // If already disconnected or stopped, return as-is
    if (device.current_status === 'disconnected' || device.current_status === 'stopped') {
      return device.current_status;
    }

    // If no last_seen_at and was running, mark as disconnected
    if (!device.last_seen_at) {
      return device.current_status === 'running' ? 'disconnected' : device.current_status;
    }

    const lastSeen = dayjs(device.last_seen_at);
    if (!lastSeen.isValid()) {
      return device.current_status === 'running' ? 'disconnected' : device.current_status;
    }

    const elapsedSeconds = now.diff(lastSeen, 'second');

    // If elapsed > timeout and was running, mark as disconnected
    if (elapsedSeconds > timeoutSeconds && device.current_status === 'running') {
      return 'disconnected';
    }

    return device.current_status;
  };

  const stats = useMemo(() => {
    const total = devices.length;
    let running = 0;
    let disconnected = 0;
    let stopped = 0;

    devices.forEach((d) => {
      const realtimeStatus = getRealtimeStatus(d);
      if (realtimeStatus === 'running') {
        running++;
      } else if (realtimeStatus === 'disconnected') {
        disconnected++;
      } else if (realtimeStatus === 'stopped') {
        stopped++;
      }
    });

    return { total, running, disconnected, stopped };
  }, [devices, now]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const base = devices.filter((d) => {
      const matchesKeyword =
        !keyword ||
        d.device_id?.toLowerCase().includes(keyword) ||
        d.device_name?.toLowerCase().includes(keyword);
      const matchesStatus = status === 'all' || d.current_status === status;
      return matchesKeyword && matchesStatus;
    });
    const sorted = [...base];
    if (sortBy === 'name') {
      sorted.sort((a, b) => (a.device_name || '').localeCompare(b.device_name || ''));
    } else if (sortBy === 'status') {
      const order: Record<string, number> = { running: 0, disconnected: 1, stopped: 2 };
      sorted.sort(
        (a, b) => (order[a.current_status || 'stopped'] ?? 9) - (order[b.current_status || 'stopped'] ?? 9)
      );
    } else if (sortBy === 'runtime') {
      sorted.sort((a, b) => (b.total_runtime_seconds || 0) - (a.total_runtime_seconds || 0));
    }
    return sorted;
  }, [devices, search, status, sortBy]);

  useEffect(() => {
    setVisibleCount(20);
  }, [search, status, sortBy, devices.length]);

  const visibleDevices = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const canLoadMoreDevices = visibleCount < filtered.length;

  const loadMoreDevicesRef = useInfiniteScrollSentinel(
    () => setVisibleCount((prev) => Math.min(prev + 20, filtered.length)),
    { enabled: !isLoading && canLoadMoreDevices, root: null, threshold: 0.5 }
  );

  const resetFilters = () => {
    setSearch('');
    setStatus('all');
    setSortBy('name');
  };

  const handleOpenDetail = (id: string) => {
    queryClient.removeQueries({ queryKey: ['device', id, 'sessions', { limit: 20, mode: 'infinite' }], exact: true });
    setSelectedId(id);
    setActiveTab('overview');
    setErrorCodesPage(1);
  };

  const handleCloseDetail = () => {
    if (selectedId) {
      queryClient.removeQueries({ queryKey: ['device', selectedId, 'sessions', { limit: 20, mode: 'infinite' }], exact: true });
    }
    setSelectedId(null);
    setActiveTab('overview');
  };

  const sessionsList = useMemo(() => {
    return sessionsData?.pages?.flatMap((p) => p.sessions) ?? [];
  }, [sessionsData]);

  const handleSessionsLoadMore = () => {
    if (!sessionsHasMore) return;
    if (sessionsLoadingMore) return;
    void fetchNextSessionsPage();
  };

  const handleExport = async () => {
    const sortField =
      sortBy === 'name' ? 'device_name' : sortBy === 'status' ? 'current_status' : 'last_seen_at';
    const sortOrder = sortBy === 'runtime' ? 'desc' : 'asc';
    const filters = status === 'all' ? undefined : { status };
    await exportServices.createExport({
      page: 'dashboard/devices',
      filters,
      sortBy: sortField,
      sortOrder
    });
  };

  const handleAddDevice = () => {
    setCreateOpen(true);
  };

  const handleCreate = async (payload: Device.CreateDeviceRequest) => {
    await deviceServices.create(payload);
    setCreateOpen(false);
    await queryClient.invalidateQueries({ queryKey: ['devices'] });
  };

  const handleUpdate = async (payload: { device_id: string; device_name: string }) => {
    await deviceServices.update(payload.device_id, { device_name: payload.device_name });
    setEditOpen(null);
    await queryClient.invalidateQueries({ queryKey: ['devices'] });
    await queryClient.invalidateQueries({ queryKey: ['device', payload.device_id, 'detail'] });
  };

  const handleDelete = async (d: { device_id: string; device_name?: string | null }) => {
    await deviceServices.delete(d.device_id);
    if (selectedId === d.device_id) {
      setSelectedId(null);
      setActiveTab('overview');
    }
    await queryClient.invalidateQueries({ queryKey: ['devices'] });
    await queryClient.invalidateQueries({ queryKey: ['device'] });
  };

  const handleUpdateNameId = async (deviceId: string, updates: { device_name?: string; device_id?: string }) => {
    await deviceServices.update(deviceId, updates);
    await queryClient.invalidateQueries({ queryKey: ['devices'] });
    await queryClient.invalidateQueries({ queryKey: ['device', deviceId, 'detail'] });
    if (updates.device_id) {
      await queryClient.invalidateQueries({ queryKey: ['device', updates.device_id, 'detail'] });
      await queryClient.invalidateQueries({ queryKey: ['device', updates.device_id, 'sessions'] });
    }
  };

  const handleUpdateSettings = async (
    deviceId: string,
    settings: { vibration_threshold?: number | null; request_interval?: number | null }
  ) => {
    await deviceDetailServices.updateDeviceSettings(deviceId, settings);
    await queryClient.invalidateQueries({ queryKey: ['device', deviceId, 'detail'] });
  };

  return (
    <PageContainer pageTitle='Thiết bị' pageDescription='Danh sách thiết bị, trạng thái và thời gian chạy'>
      <div className='space-y-6'>
        <DeviceStatsBar stats={stats} />

        <Card className='border border-border/80 dark:border-border/60 shadow-md dark:shadow-lg transition-shadow duration-300 hover:shadow-lg dark:hover:shadow-xl'>
          <CardHeader className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4'>
            <DeviceFilters
              search={search}
              status={status}
              sortBy={sortBy}
              onSearch={setSearch}
              onStatus={setStatus}
              onSort={setSortBy}
              onReset={resetFilters}
              onExport={handleExport}
              onAdd={handleAddDevice}
            />
          </CardHeader>

          <CardContent className='pt-0'>
            {error ? (
              <ErrorBox message={(error as Error).message} />
            ) : (
              <DeviceGrid
                devices={visibleDevices}
                loading={isLoading}
                onView={(device) => handleOpenDetail(device.device_id)}
                onEdit={(device) => setEditOpen(device)}
                onDelete={(device) => setConfirmDelete({ open: true, device })}
                emptyMessage='Không có thiết bị phù hợp.'
              />
            )}
            <div ref={loadMoreDevicesRef} className='h-8 w-full' />
            {canLoadMoreDevices && (
              <div className='mt-2 text-center text-xs text-muted-foreground'>
                Cuộn xuống để tải thêm thiết bị...
              </div>
            )}
          </CardContent>

          <CardFooter className='flex flex-col gap-2 border-t border-border/60 dark:border-border/40 bg-muted/30 dark:bg-muted/20 pt-4 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground'>
            <div className='font-medium'>
              Đang hiển thị <span className='font-bold text-foreground'>{Math.min(visibleCount, filtered.length)}</span>/
              <span className='font-bold text-foreground'>{filtered.length}</span> thiết bị
            </div>
            <div className='flex gap-2'>
              <Button variant='outline' size='sm' onClick={resetFilters} className='transition-all duration-200'>
                Đặt lại bộ lọc
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <DeviceDetailModal
        open={!!selectedId}
        onClose={handleCloseDetail}
        detail={detail}
        loading={detailLoading}
        error={detailError as Error | null}
        sessions={sessionsList}
        sessionsLoading={sessionsLoading}
        sessionsLoadingMore={sessionsLoadingMore}
        sessionsError={sessionsError as Error | null}
        sessionsHasMore={!!sessionsHasMore}
        onSessionsLoadMore={handleSessionsLoadMore}
        errorCodes={errorCodes}
        errorCodesLoading={errorCodesLoading}
        errorCodesError={errorCodesError as Error | null}
        errorCodesPage={errorCodesPage}
        errorCodesStatus={errorCodesStatus}
        errorCodesType={errorCodesType}
        onErrorCodesPageChange={setErrorCodesPage}
        onErrorCodesStatusChange={setErrorCodesStatus}
        onErrorCodesTypeChange={setErrorCodesType}
        runtimeChart={runtimeChart}
        runtimeChartLoading={runtimeChartLoading}
        runtimeChartError={runtimeChartError as Error | null}
        runtimeRange={runtimeRange}
        onRuntimeRangeChange={setRuntimeRange}
        vibrationChart={vibrationChart}
        vibrationChartLoading={vibrationChartLoading}
        vibrationChartError={vibrationChartError as Error | null}
        vibrationPeriod={vibrationPeriod}
        onVibrationPeriodChange={setVibrationPeriod}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onUpdateNameId={handleUpdateNameId}
        onUpdateSettings={handleUpdateSettings}
        onDeleteDevice={(d) => setConfirmDelete({ open: true, device: d })}
      />

      <DeviceCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
      <DeviceEditModal open={!!editOpen} onClose={() => setEditOpen(null)} device={editOpen} onUpdate={handleUpdate} />
      <ConfirmDialog
        open={confirmDelete.open}
        title='Xóa thiết bị'
        description={
          confirmDelete.device
            ? `Bạn có chắc muốn xóa thiết bị ${confirmDelete.device.device_name ?? confirmDelete.device.device_id}?`
            : 'Bạn có chắc muốn xóa thiết bị này?'
        }
        variant='destructive'
        confirmLabel='Xóa'
        cancelLabel='Hủy'
        onCancel={() => setConfirmDelete({ open: false })}
        onConfirm={async () => {
          if (!confirmDelete.device) return;
          try {
            await handleDelete(confirmDelete.device);
          } finally {
            setConfirmDelete({ open: false });
          }
        }}
      />
    </PageContainer>
  );
}

