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

const AlertsPage = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [severity, setSeverity] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
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

  const rows = useMemo(() => alerts.data?.items ?? alerts.data?.data?.items ?? [], [alerts.data]);
  const pagination = alerts.data?.pagination ?? {
    page,
    limit: PAGE_SIZE,
    total: rows.length,
    totalPages: 1,
  };

  useEffect(() => {
    setSelected((current) => current.filter((id) => rows.some((row: any) => row.id === id)));
  }, [rows]);

  const stats = useMemo(() => {
    const pending = rows.filter((item: any) => item.status === 'active').length;
    const acknowledged = rows.filter((item: any) => item.status === 'acknowledged').length;
    const critical = rows.filter((item: any) => item.severity === 'critical').length;
    return {
      total: pagination.total,
      pending,
      acknowledged,
      critical,
    };
  }, [pagination.total, rows]);

  return (
    <PageContainer
      pageTitle="Cảnh báo"
      pageDescription="Quản lý cảnh báo hệ thống theo mức độ và trạng thái xử lý"
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
          isLoading={alerts.isLoading}
        />
        <StatCard
          title="Chưa xử lý"
          value={stats.pending}
          icon={<CircleDashed className="h-4 w-4" />}
          isLoading={alerts.isLoading}
        />
        <StatCard
          title="Đã xác nhận"
          value={stats.acknowledged}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={alerts.isLoading}
        />
        <StatCard
          title="Mức nghiêm trọng"
          value={stats.critical}
          icon={<ShieldAlert className="h-4 w-4" />}
          isLoading={alerts.isLoading}
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
        pagination={false}
        toolbar={
          <AlertFilters
            severity={severity}
            status={status}
            onChange={(next) => {
              setPage(1);
              setSeverity(next.severity);
              setStatus(next.status);
            }}
            onReset={() => {
              setPage(1);
              setSeverity(undefined);
              setStatus(undefined);
            }}
          />
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Trang {pagination.page} / {pagination.totalPages || 1} · {pagination.total} cảnh báo
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
