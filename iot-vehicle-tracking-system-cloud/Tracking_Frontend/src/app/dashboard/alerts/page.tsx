'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleCheckBig, CircleDashed, ShieldAlert } from 'lucide-react';
import { DataTable } from '@/components/common/data-table';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/common/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getAlertColumns } from '@/features/alerts/components/alert-columns';
import { AlertDetailModal } from '@/features/alerts/components/alert-detail-modal';
import { AlertFilters } from '@/features/alerts/components/alert-filters';
import { alertServices, isObdMaintenanceAlert, localizeAlertForDisplay } from '@/lib/api/alerts';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';

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
  const [page, setPage] = useState(1);

  useEffect(() => {
    setSelected([]);
    setDetail(null);
    setPage(1);
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

  const alerts = useQuery({
    queryKey: ['alerts', { severity, status, source, deviceId, vehicleId, page, limit: PAGE_SIZE }],
    queryFn: () =>
      alertServices.getList({
        page,
        limit: PAGE_SIZE,
        severity,
        status,
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
    queryKey: ['alerts-summary-total', { severity, status, deviceId, vehicleId }],
    queryFn: () => fetchAlertCount({ severity, status, deviceId, vehicleId }),
    enabled: source === 'all',
  });

  const summaryActive = useQuery({
    queryKey: ['alerts-summary-active', { severity, status, deviceId, vehicleId }],
    queryFn: () => fetchAlertCount({ severity, status: 'active', deviceId, vehicleId }),
    enabled: source === 'all' && (!status || status === 'active'),
  });

  const summaryAcknowledged = useQuery({
    queryKey: ['alerts-summary-acknowledged', { severity, status, deviceId, vehicleId }],
    queryFn: () => fetchAlertCount({ severity, status: 'acknowledged', deviceId, vehicleId }),
    enabled: source === 'all' && (!status || status === 'acknowledged'),
  });

  const summaryCritical = useQuery({
    queryKey: ['alerts-summary-critical', { severity, status, deviceId, vehicleId }],
    queryFn: () => fetchAlertCount({ severity: 'critical', status, deviceId, vehicleId }),
    enabled: source === 'all' && (!severity || severity === 'critical'),
  });

  const ackMutation = useMutation({
    mutationFn: (id: number) => alertServices.acknowledge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    onError: (error: unknown) => {
      notificationUtils.error(
        'XÃ¡c nháº­n cáº£nh bÃ¡o tháº¥t báº¡i',
        getApiErrorMessage(error, 'KhÃ´ng thá»ƒ cáº­p nháº­t tráº¡ng thÃ¡i cáº£nh bÃ¡o.'),
      );
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: number) => alertServices.resolve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    onError: (error: unknown) => {
      notificationUtils.error(
        'ÄÃ³ng cáº£nh bÃ¡o tháº¥t báº¡i',
        getApiErrorMessage(error, 'KhÃ´ng thá»ƒ Ä‘Ã³ng cáº£nh bÃ¡o.'),
      );
    },
  });

  const allRows = useMemo(
    () =>
      (alerts.data?.items ?? alerts.data?.data?.items ?? []).map((item: any) =>
        localizeAlertForDisplay(item),
      ),
    [alerts.data],
  );

  const rows = useMemo(() => {
    if (source === 'all') {
      return allRows;
    }

    return allRows.filter((item: any) => {
      const isObd = isObdMaintenanceAlert(item);
      return source === 'obd' ? isObd : !isObd;
    });
  }, [allRows, source]);

  const pagination = alerts.data?.pagination ?? {
    page,
    limit: PAGE_SIZE,
    total: allRows.length,
    totalPages: 1,
  };

  useEffect(() => {
    setSelected((current) => current.filter((id) => rows.some((row: any) => row.id === id)));
  }, [rows]);

  const stats = useMemo(() => {
    const localPending = rows.filter((item: any) => item.status === 'active').length;
    const localAcknowledged = rows.filter((item: any) => item.status === 'acknowledged').length;
    const localCritical = rows.filter((item: any) => item.severity === 'critical').length;
    const localTotal = rows.length;

    if (source !== 'all') {
      return {
        total: localTotal,
        pending: localPending,
        acknowledged: localAcknowledged,
        critical: localCritical,
      };
    }

    const total = summaryTotal.data ?? pagination.total ?? localTotal;
    const pending = status
      ? status === 'active'
        ? total
        : 0
      : (summaryActive.data ?? localPending);
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
    source,
    severity,
    status,
    pagination.total,
    summaryTotal.data,
    summaryActive.data,
    summaryAcknowledged.data,
    summaryCritical.data,
  ]);

  const summaryCardsLoading =
    alerts.isLoading ||
    (source === 'all' &&
      (summaryTotal.isLoading ||
        summaryActive.isLoading ||
        summaryAcknowledged.isLoading ||
        summaryCritical.isLoading));
  const hasMapContext = Boolean(deviceId || vehicleId);

  const clearFilters = () => {
    setPage(1);
    setSeverity(undefined);
    setStatus(undefined);
    setSource('all');
    setDeviceId(undefined);
    setVehicleId(undefined);
    setSelected([]);
    setDetail(null);
    router.replace('/dashboard/attention/queue');
  };

  return (
    <PageContainer
      pageTitle="Cáº£nh bÃ¡o"
      pageHeaderAction={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={selected.length === 0 || ackMutation.isPending}
            onClick={() => selected.forEach((id) => ackMutation.mutate(id))}
          >
            XÃ¡c nháº­n Ä‘Ã£ chá»n
          </Button>
          <Button
            disabled={selected.length === 0 || resolveMutation.isPending}
            onClick={() => selected.forEach((id) => resolveMutation.mutate(id))}
          >
            Giáº£i quyáº¿t Ä‘Ã£ chá»n
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tá»•ng cáº£nh bÃ¡o"
          value={stats.total}
          icon={<AlertTriangle className="h-4 w-4" />}
          isLoading={summaryCardsLoading}
        />
        <StatCard
          title="ChÆ°a xá»­ lÃ½"
          value={stats.pending}
          icon={<CircleDashed className="h-4 w-4" />}
          isLoading={summaryCardsLoading}
        />
        <StatCard
          title="ÄÃ£ xÃ¡c nháº­n"
          value={stats.acknowledged}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={summaryCardsLoading}
        />
        <StatCard
          title="Má»©c nghiÃªm trá»ng"
          value={stats.critical}
          icon={<ShieldAlert className="h-4 w-4" />}
          isLoading={summaryCardsLoading}
          trend={{
            value: `${stats.total > 0 ? ((stats.critical / stats.total) * 100).toFixed(1) : '0.0'}% tá»•ng cáº£nh bÃ¡o`,
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
                  aria-label="Chá»n táº¥t cáº£ cáº£nh bÃ¡o"
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
                    aria-label={`Chá»n cáº£nh bÃ¡o ${row.original.title}`}
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
                    Chá»n cáº£nh bÃ¡o {row.original.title}
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
        searchKey="title"
        searchPlaceholder="TÃ¬m cáº£nh bÃ¡o..."
        isLoading={alerts.isLoading}
        onRowClick={setDetail}
        toolbar={
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <AlertFilters
              severity={severity}
              status={status}
              source={source}
              onChange={(next) => {
                setPage(1);
                setSeverity(next.severity);
                setStatus(next.status);
                setSource(next.source ?? 'all');
              }}
              onReset={clearFilters}
            />
            {hasMapContext ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                <p className="font-medium text-muted-foreground">Ngá»¯ cáº£nh tá»« báº£n Ä‘á»“</p>
                {vehicleId ? <Badge variant="secondary">Xe: {vehicleId}</Badge> : null}
                {deviceId ? <Badge variant="outline">Thiáº¿t bá»‹: {deviceId}</Badge> : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={clearFilters}
                >
                  Bá» ngá»¯ cáº£nh
                </Button>
              </div>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Trang {pagination.page} / {pagination.totalPages || 1} Â· Server: {pagination.total} báº£n ghi Â· Hiá»ƒn thá»‹: {rows.length}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => current - 1)}
            disabled={pagination.page <= 1 || alerts.isFetching}
          >
            Trang trÆ°á»›c
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => current + 1)}
            disabled={pagination.page >= (pagination.totalPages || 1) || alerts.isFetching}
          >
            Trang sau
          </Button>
        </div>
      </div>

      <AlertDetailModal open={!!detail} onOpenChange={(value) => !value && setDetail(null)} alert={detail} />
    </PageContainer>
  );
};

export default AlertsPage;
