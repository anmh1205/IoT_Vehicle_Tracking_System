'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { Button } from '@/components/ui/button';
import { alertServices } from '@/lib/api/alerts';
import { getAlertColumns } from '@/features/alerts/components/alert-columns';
import { AlertFilters } from '@/features/alerts/components/alert-filters';
import { AlertDetailModal } from '@/features/alerts/components/alert-detail-modal';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [severity, setSeverity] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const alerts = useQuery({ queryKey: ['alerts'], queryFn: () => alertServices.getList({ limit: 200 }) });
  const ackMutation = useMutation({ mutationFn: (id: number) => alertServices.acknowledge(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }) });
  const resolveMutation = useMutation({ mutationFn: (id: number) => alertServices.resolve(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }) });

  const rows = useMemo(() => {
    const list = alerts.data?.items ?? alerts.data?.data?.items ?? [];
    return list.filter((item: any) => {
      if (severity && item.severity !== severity) return false;
      if (status && item.status !== status) return false;
      return true;
    });
  }, [alerts.data, severity, status]);

  return (
    <PageContainer
      pageTitle="Cảnh báo"
      pageDescription="Quản lý cảnh báo hệ thống"
      pageHeaderAction={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => selected.forEach((id) => ackMutation.mutate(id))}>Xác nhận tất cả</Button>
          <Button onClick={() => selected.forEach((id) => resolveMutation.mutate(id))}>Giải quyết tất cả</Button>
        </div>
      }
    >
      <DataTable
        columns={[
          {
            id: 'select',
            header: () => <input type="checkbox" onChange={(e) => setSelected(e.target.checked ? rows.map((a: any) => a.id) : [])} />,
            cell: ({ row }: any) => <input type="checkbox" checked={selected.includes(row.original.id)} onChange={(e) => setSelected((s) => e.target.checked ? [...s, row.original.id] : s.filter((id) => id !== row.original.id))} />,
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
        toolbar={<AlertFilters severity={severity} status={status} onChange={(next) => { setSeverity(next.severity); setStatus(next.status); }} />}
      />

      <AlertDetailModal open={!!detail} onOpenChange={(v) => !v && setDetail(null)} alert={detail} />
    </PageContainer>
  );
}

