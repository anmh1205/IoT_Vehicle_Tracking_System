'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleCheckBig, CircleDashed, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { StatCard } from '@/components/common/stat-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { alertServices } from '@/lib/api/alerts';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { getAlertColumns } from '@/features/alerts/components/alert-columns';
import { AlertFilters } from '@/features/alerts/components/alert-filters';
import { AlertDetailModal } from '@/features/alerts/components/alert-detail-modal';

const PAGE_SIZE = 50;

const getPaginationTotal = (payload: any): number => {
  const parsed = Number(payload?.pagination?.total ?? payload?.data?.pagination?.total ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const isObdMaintenanceAlert = (item: any): boolean => {
  const title = String(item?.title ?? '').toLowerCase();
  const message = String(item?.message ?? '').toLowerCase();
  const signature = `${title} ${message}`;

  return (
    item?.alertType === 'maintenance_due' &&
    (signature.includes('obd') ||
      signature.includes('coolant') ||
      signature.includes('voltage') ||
      signature.includes('idle-load') ||
      signature.includes('channel'))
  );
};

const localizeObdAlertTitle = (title: string): string => {
  const normalized = title.toLowerCase();

  if (normalized.includes('idle-load anomaly')) {
    return 'OBD: Bất thường không tải';
  }
  if (normalized.includes('coolant risk pattern')) {
    return 'OBD: Rủi ro nhiệt độ nước làm mát';
  }
  if (normalized.includes('channel unstable')) {
    return 'OBD: Kênh kết nối không ổn định';
  }
  if (normalized.includes('voltage risk under load')) {
    return 'OBD: Rủi ro điện áp khi tải cao';
  }

  return title;
};

const localizeObdAlertMessage = (message: string): string => {
  const idleLoadMatch = message.match(
    /^RPM\s+([\d.]+)\s+while speed\s+([\d.]+)\s+km\/h\s+for\s+([\d.]+)\s+minutes\.?$/i,
  );
  if (idleLoadMatch) {
    return `Vòng tua ${idleLoadMatch[1]} khi tốc độ ${idleLoadMatch[2]} km/h trong ${idleLoadMatch[3]} phút.`;
  }

  const coolantMatch = message.match(
    /^Coolant\s+([\d.]+)C\s+with engine load\s+([\d.]+)%\s+sustained at runtime\.?$/i,
  );
  if (coolantMatch) {
    return `Nhiệt độ nước làm mát ${coolantMatch[1]}°C với tải động cơ ${coolantMatch[2]}% trong lúc vận hành.`;
  }

  const channelMatch = message.match(
    /^OBD connect\/init failed\s+([\d.]+)\s+times in the last 5 minutes\.?$/i,
  );
  if (channelMatch) {
    return `Kết nối/khởi tạo OBD thất bại ${channelMatch[1]} lần trong 5 phút gần nhất.`;
  }

  const voltageMatch = message.match(
    /^Battery top\s+([\d.]+)V\s+while engine load\s+([\d.]+)%\.?$/i,
  );
  if (voltageMatch) {
    return `Điện áp ắc quy chính ${voltageMatch[1]}V khi tải động cơ ${voltageMatch[2]}%.`;
  }

  return message;
};

const AlertsPage = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [severity, setSeverity] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<'all' | 'obd' | 'system'>('all');
  const [page, setPage] = useState(1);

  const alerts = useQuery({
    queryKey: ['alerts', { severity, status, page, limit: PAGE_SIZE }],
    queryFn: () =>
      alertServices.getList({
        page,
        limit: PAGE_SIZE,
        severity,
        status,
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
    queryKey: ['alerts-summary-total', { severity, status }],
    queryFn: () => fetchAlertCount({ severity, status }),
    enabled: source === 'all',
  });

  const summaryActive = useQuery({
    queryKey: ['alerts-summary-active', { severity, status }],
    queryFn: () => fetchAlertCount({ severity, status: 'active' }),
    enabled: source === 'all' && (!status || status === 'active'),
  });

  const summaryAcknowledged = useQuery({
    queryKey: ['alerts-summary-acknowledged', { severity, status }],
    queryFn: () => fetchAlertCount({ severity, status: 'acknowledged' }),
    enabled: source === 'all' && (!status || status === 'acknowledged'),
  });

  const summaryCritical = useQuery({
    queryKey: ['alerts-summary-critical', { severity, status }],
    queryFn: () => fetchAlertCount({ severity: 'critical', status }),
    enabled: source === 'all' && (!severity || severity === 'critical'),
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
      (alerts.data?.items ?? alerts.data?.data?.items ?? []).map((item: any) => {
        if (!isObdMaintenanceAlert(item)) {
          return item;
        }

        return {
          ...item,
          title: localizeObdAlertTitle(String(item.title ?? 'Cảnh báo bảo trì OBD')),
          message:
            item.message == null ? null : localizeObdAlertMessage(String(item.message)),
        };
      }),
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

  return (
    <PageContainer
      pageTitle="Cảnh báo"
      pageDescription="Quản lý cảnh báo hệ thống theo mức độ, trạng thái và nguồn OBD"
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
            value: `${stats.total > 0 ? ((stats.critical / stats.total) * 100).toFixed(1) : '0.0'}% tổng cảnh báo`,
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
        searchKey="title"
        searchPlaceholder="Tìm cảnh báo..."
        isLoading={alerts.isLoading}
        onRowClick={setDetail}
        toolbar={
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
            onReset={() => {
              setPage(1);
              setSeverity(undefined);
              setStatus(undefined);
              setSource('all');
            }}
          />
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Trang {pagination.page} / {pagination.totalPages || 1} · Server: {pagination.total} bản ghi · Hiển thị: {rows.length}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => current - 1)}
            disabled={pagination.page <= 1 || alerts.isFetching}
          >
            Trang trước
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

      <AlertDetailModal
        open={!!detail}
        onOpenChange={(value) => !value && setDetail(null)}
        alert={detail}
      />
    </PageContainer>
  );
};

export default AlertsPage;
