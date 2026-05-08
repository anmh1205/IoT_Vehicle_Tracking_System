'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleCheckBig, CircleDashed, Search, ShieldAlert } from 'lucide-react';
import { DataTable } from '@/components/common/data-table';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/common/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAlertColumns } from '@/features/alerts/components/alert-columns';
import { AlertDetailModal } from '@/features/alerts/components/alert-detail-modal';
import { AlertFilters } from '@/features/alerts/components/alert-filters';
import { alertServices, localizeAlertForDisplay } from '@/lib/api/alerts';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { formatNumber } from '@/lib/utils/date/format';
import { useInfiniteListQuery } from '@/hooks/use-infinite-list-query';

const PAGE_SIZE = 50;

const getPaginationTotal = (payload: any): number => {
  const parsed = Number(payload?.pagination?.total ?? payload?.data?.pagination?.total ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const normalizeSearchParam = (value: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

const normalizeSourceParam = (value: string | null): 'all' | 'obd' | 'system' =>
  value === 'obd' || value === 'system' ? value : 'all';

const AlertsPage = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeFilters = useMemo(
    () => ({
      severity: normalizeSearchParam(searchParams.get('severity')),
      status: normalizeSearchParam(searchParams.get('status')),
      source: normalizeSourceParam(searchParams.get('source')),
      deviceId: normalizeSearchParam(searchParams.get('deviceId')),
      vehicleId: normalizeSearchParam(searchParams.get('vehicleId')),
    }),
    [searchParams],
  );
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [severity, setSeverity] = useState<string | undefined>(routeFilters.severity);
  const [status, setStatus] = useState<string | undefined>(routeFilters.status);
  const [source, setSource] = useState<'all' | 'obd' | 'system'>(routeFilters.source);
  const [deviceId, setDeviceId] = useState<string | undefined>(routeFilters.deviceId);
  const [vehicleId, setVehicleId] = useState<string | undefined>(routeFilters.vehicleId);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const sourceParam = source === 'all' ? undefined : source;

  useEffect(() => {
    setSelected([]);
    setDetail(null);
    setSeverity(routeFilters.severity);
    setStatus(routeFilters.status);
    setSource(routeFilters.source);
    setDeviceId(routeFilters.deviceId);
    setVehicleId(routeFilters.vehicleId);
  }, [
    routeFilters.deviceId,
    routeFilters.severity,
    routeFilters.source,
    routeFilters.status,
    routeFilters.vehicleId,
  ]);

  const alerts = useInfiniteListQuery<any>({
    queryKey: [
      'alerts',
      {
        severity,
        status,
        source,
        search: deferredSearch,
        deviceId,
        vehicleId,
      },
    ],
    pageSize: PAGE_SIZE,
    queryFn: ({ page, limit }) =>
      alertServices.getList({
        page,
        limit,
        severity,
        status,
        source: sourceParam,
        search: deferredSearch || undefined,
        deviceId,
        vehicleId,
      }),
  });

  const fetchAlertCount = (params: Record<string, unknown>) =>
    alertServices
      .getList({
        ...params,
        page: 1,
        limit: 1,
      })
      .then((payload) => getPaginationTotal(payload));

  const summaryTotal = useQuery({
    queryKey: [
      'alerts-summary-total',
      { severity, status, source, search: deferredSearch, deviceId, vehicleId },
    ],
    queryFn: () =>
      fetchAlertCount({
        severity,
        status,
        source: sourceParam,
        search: deferredSearch || undefined,
        deviceId,
        vehicleId,
      }),
  });

  const summaryActive = useQuery({
    queryKey: [
      'alerts-summary-active',
      { severity, source, search: deferredSearch, deviceId, vehicleId },
    ],
    queryFn: () =>
      fetchAlertCount({
        severity,
        status: 'active',
        source: sourceParam,
        search: deferredSearch || undefined,
        deviceId,
        vehicleId,
      }),
    enabled: !status || status === 'active',
  });

  const summaryAcknowledged = useQuery({
    queryKey: [
      'alerts-summary-acknowledged',
      { severity, source, search: deferredSearch, deviceId, vehicleId },
    ],
    queryFn: () =>
      fetchAlertCount({
        severity,
        status: 'acknowledged',
        source: sourceParam,
        search: deferredSearch || undefined,
        deviceId,
        vehicleId,
      }),
    enabled: !status || status === 'acknowledged',
  });

  const summaryCritical = useQuery({
    queryKey: [
      'alerts-summary-critical',
      { status, source, search: deferredSearch, deviceId, vehicleId },
    ],
    queryFn: () =>
      fetchAlertCount({
        severity: 'critical',
        status,
        source: sourceParam,
        search: deferredSearch || undefined,
        deviceId,
        vehicleId,
      }),
    enabled: !severity || severity === 'critical',
  });

  const ackMutation = useMutation({
    mutationFn: (id: number) => alertServices.acknowledge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xác nhận cảnh báo thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật trạng thái cảnh báo.'),
      );
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => alertServices.resolve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    onError: (error: unknown) => {
      notificationUtils.error(
        'Đóng cảnh báo thất bại',
        getApiErrorMessage(error, 'Không thể đóng cảnh báo.'),
      );
    },
  });

  const allRows = useMemo(
    () =>
      alerts.items.map((item: any) =>
        localizeAlertForDisplay(item),
      ),
    [alerts.items],
  );

  const rows = allRows;

  useEffect(() => {
    setSelected((current) => current.filter((id) => rows.some((row: any) => row.id === id)));
  }, [rows]);

  const stats = useMemo(() => {
    const localPending = rows.filter((item: any) => item.status === 'active').length;
    const localAcknowledged = rows.filter((item: any) => item.status === 'acknowledged').length;
    const localCritical = rows.filter((item: any) => item.severity === 'critical').length;
    const localTotal = rows.length;

    const total = summaryTotal.data ?? alerts.total ?? localTotal;
    const pending = status ? (status === 'active' ? total : 0) : (summaryActive.data ?? localPending);
    const acknowledged = status
      ? status === 'acknowledged'
        ? total
        : 0
      : (summaryAcknowledged.data ?? localAcknowledged);
    const critical = severity
      ? severity === 'critical'
        ? total
        : 0
      : (summaryCritical.data ?? localCritical);

    return {
      total,
      pending,
      acknowledged,
      critical,
    };
  }, [
    rows,
    alerts.total,
    severity,
    status,
    summaryTotal.data,
    summaryActive.data,
    summaryAcknowledged.data,
    summaryCritical.data,
  ]);

  const summaryCardsLoading =
    alerts.isLoading ||
    summaryTotal.isLoading ||
    summaryActive.isLoading ||
    summaryAcknowledged.isLoading ||
    summaryCritical.isLoading;
  const hasMapContext = Boolean(deviceId || vehicleId);

  const clearFilters = () => {
    setSeverity(undefined);
    setStatus(undefined);
    setSource('all');
    setSearch('');
    setDeviceId(undefined);
    setVehicleId(undefined);
    setSelected([]);
    setDetail(null);
    router.replace('/dashboard/attention/queue');
  };

  return (
    <PageContainer
      pageTitle="Cảnh báo"
      pageHeaderAction={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={selected.length === 0 || ackMutation.isPending}
            onClick={() => selected.forEach((id) => ackMutation.mutate(id))}
          >
            Xác nhận đã chọn
          </Button>
          <Button
            disabled={selected.length === 0 || resolveMutation.isPending}
            onClick={() => selected.forEach((id) => resolveMutation.mutate(id))}
          >
            Giải quyết đã chọn
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng cảnh báo"
          value={stats.total}
          icon={<AlertTriangle className="h-4 w-4" />}
          isLoading={summaryCardsLoading}
        />
        <StatCard
          title="Chưa xử lý"
          value={stats.pending}
          icon={<CircleDashed className="h-4 w-4" />}
          isLoading={summaryCardsLoading}
        />
        <StatCard
          title="Đã xác nhận"
          value={stats.acknowledged}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={summaryCardsLoading}
        />
        <StatCard
          title="Mức nghiêm trọng"
          value={stats.critical}
          icon={<ShieldAlert className="h-4 w-4" />}
          isLoading={summaryCardsLoading}
          trend={{
            value: `${stats.total > 0 ? formatNumber((stats.critical / stats.total) * 100) : '0'}% tổng cảnh báo`,
            positive: false,
          }}
        />
      </div>

      <DataTable
        columns={[
          {
            id: 'select',
            header: () => (
              <div className="flex items-center justify-center">
                <Checkbox
                  id="alerts-select-all"
                  aria-label="Chọn tất cả cảnh báo"
                  checked={rows.length > 0 && selected.length === rows.length}
                  onCheckedChange={(checked) =>
                    setSelected(checked ? rows.map((alert: any) => alert.id) : [])
                  }
                />
              </div>
            ),
            cell: ({ row }: any) => {
              const id = `alerts-select-${row.original.id}`;
              return (
                <div className="flex items-center justify-center">
                  <Checkbox
                    id={id}
                    aria-label={`Chọn cảnh báo ${row.original.title}`}
                    checked={selected.includes(row.original.id)}
                    onCheckedChange={(checked) =>
                      setSelected((current) =>
                        checked
                          ? [...current, row.original.id]
                          : current.filter((item) => item !== row.original.id),
                      )
                    }
                  />
                  <Label htmlFor={id} className="sr-only">
                    Chọn cảnh báo {row.original.title}
                  </Label>
                </div>
              );
            },
          },
          ...getAlertColumns({
            onAck: (id) => ackMutation.mutate(id),
            onResolve: (id) => resolveMutation.mutate(id),
            onView: (row) => setDetail(row),
          }),
        ]}
        data={rows}
        pagination={false}
        isLoading={alerts.isLoading}
        onRowClick={setDetail}
        toolbar={
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo tiêu đề, mô tả, loại cảnh báo, xe hoặc thiết bị..."
                className="pl-9"
                type="search"
              />
            </div>
            <AlertFilters
              severity={severity}
              status={status}
              source={source}
              onChange={(next) => {
                setSeverity(next.severity);
                setStatus(next.status);
                setSource(next.source ?? 'all');
              }}
              onReset={clearFilters}
            />
            {hasMapContext ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <p className="font-medium text-muted-foreground">Ngữ cảnh từ bản đồ</p>
                {vehicleId ? <Badge variant="secondary">Xe: {vehicleId}</Badge> : null}
                {deviceId ? <Badge variant="outline">Thiết bị: {deviceId}</Badge> : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={clearFilters}
                >
                  Bỏ ngữ cảnh
                </Button>
              </div>
            ) : null}
          </div>
        }
      />

      <InfiniteScrollTrigger
        hasMore={alerts.hasMore}
        isLoadingMore={alerts.isFetchingNextPage}
        onLoadMore={alerts.loadMore}
        loadedCount={alerts.loadedCount}
        totalCount={alerts.total}
        itemLabel="cảnh báo"
      />

      <AlertDetailModal
        open={!!detail}
        onOpenChange={(value) => !value && setDetail(null)}
        alert={detail}
      />
    </PageContainer>
  );
};

export default AlertsPage;
