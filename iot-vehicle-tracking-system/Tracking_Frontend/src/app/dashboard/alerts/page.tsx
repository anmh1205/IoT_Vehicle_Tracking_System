'use client';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CircleCheckBig, CircleDashed, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { StatCard } from '@/components/common/stat-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { alertServices } from '@/lib/api/alerts';
import { getAlertColumns } from '@/features/alerts/components/alert-columns';
import { AlertFilters } from '@/features/alerts/components/alert-filters';
import { AlertDetailModal } from '@/features/alerts/components/alert-detail-modal';
const AlertsPage = () => {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [severity, setSeverity] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const alerts = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertServices.getList({ limit: 200 }),
  });
  const ackMutation = useMutation({
    mutationFn: (id: number) => alertServices.acknowledge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
  const resolveMutation = useMutation({
    mutationFn: (id: number) => alertServices.resolve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
  const rows = useMemo(() => {
    const list = alerts.data?.items ?? alerts.data?.data?.items ?? [];
    return list.filter((item: any) => {
      if (severity && item.severity !== severity) return false;
      if (status && item.status !== status) return false;
      return true;
    });
  }, [alerts.data, severity, status]);

  const stats = useMemo(() => {
    const pending = rows.filter((item: any) => item.status === 'active').length;
    const acknowledged = rows.filter((item: any) => item.status === 'acknowledged').length;
    const critical = rows.filter((item: any) => item.severity === 'critical').length;
    return {
      total: rows.length,
      pending,
      acknowledged,
      critical,
    };
  }, [rows]);
  return (
    <PageContainer
      pageTitle="Cảnh báo"
      pageDescription="Quản lý cảnh báo hệ thống"
      pageHeaderAction={
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => selected.forEach((id) => ackMutation.mutate(id))}
          >
            Xác nhận tất cả
          </Button>
          <Button onClick={() => selected.forEach((id) => resolveMutation.mutate(id))}>
            Giải quyết tất cả
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
                    setSelected(checked ? rows.map((a: any) => a.id) : [])
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
                      setSelected((s) =>
                        checked ? [...s, row.original.id] : s.filter((item) => item !== row.original.id),
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
        toolbar={
          <AlertFilters
            severity={severity}
            status={status}
            onChange={(next) => {
              setSeverity(next.severity);
              setStatus(next.status);
            }}
          />
        }
      />

      <AlertDetailModal
        open={!!detail}
        onOpenChange={(v) => !v && setDetail(null)}
        alert={detail}
      />
    </PageContainer>
  );
};
export default AlertsPage;
