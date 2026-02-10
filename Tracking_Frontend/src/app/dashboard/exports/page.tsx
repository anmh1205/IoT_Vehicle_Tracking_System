'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportServices } from '@/lib/api/exports';
import { useSocket } from '@/components/providers/socket-provider';
import { Progress } from '@/components/ui/progress';
import type { ColumnDef } from '@tanstack/react-table';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Đang chờ',
  processing: 'Đang xử lý',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
};

const EXPORT_TYPE_LABELS: Record<string, string> = {
  devices: 'Thiết bị',
  vehicles: 'Phương tiện',
  alerts: 'Cảnh báo',
  trips: 'Chuyến đi',
  maintenance: 'Bảo trì',
};

function ExportForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ exportType: 'devices', format: 'csv', from: '', to: '' });
  const createMutation = useMutation({ mutationFn: () => exportServices.create(form), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exports'] }); onOpenChange(false); } });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tạo yêu cầu xuất dữ liệu</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={form.exportType} onValueChange={(value) => setForm((s) => ({ ...s, exportType: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="devices">Thiết bị</SelectItem>
              <SelectItem value="vehicles">Phương tiện</SelectItem>
              <SelectItem value="alerts">Cảnh báo</SelectItem>
              <SelectItem value="trips">Chuyến đi</SelectItem>
              <SelectItem value="maintenance">Bảo trì</SelectItem>
            </SelectContent>
          </Select>
          <Select value={form.format} onValueChange={(value) => setForm((s) => ({ ...s, format: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          <input type="date" className="w-full rounded border p-2 text-sm" value={form.from} onChange={(e) => setForm((s) => ({ ...s, from: e.target.value }))} />
          <input type="date" className="w-full rounded border p-2 text-sm" value={form.to} onChange={(e) => setForm((s) => ({ ...s, to: e.target.value }))} />
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button><Button onClick={() => createMutation.mutate()}>Tạo yêu cầu</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ExportsPage() {
  const [open, setOpen] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});
  const exportsQuery = useQuery({ queryKey: ['exports'], queryFn: () => exportServices.getList({ limit: 200 }) });
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    const onProgress = (payload: any) => setProgressMap((prev) => ({ ...prev, [payload.jobId]: payload.progress ?? 0 }));
    socket.on('export:progress', onProgress);
    return () => {
      socket.off('export:progress', onProgress);
    };
  }, [socket]);

  const rows = exportsQuery.data?.items ?? exportsQuery.data?.data?.items ?? exportsQuery.data ?? [];

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'exportType', header: ({ column }) => <DataTableColumnHeader column={column} title="Đối tượng" />, cell: ({ row }) => EXPORT_TYPE_LABELS[row.original.exportType] ?? row.original.exportType },
    { accessorKey: 'status', header: 'Trạng thái', cell: ({ row }) => STATUS_LABELS[row.original.status] ?? row.original.status },
    {
      id: 'progress',
      header: 'Tiến độ',
      cell: ({ row }) => <Progress value={progressMap[row.original.id] ?? (row.original.status === 'completed' ? 100 : 0)} />,
    },
    { accessorKey: 'createdAt', header: 'Thời điểm tạo' },
    {
      id: 'download',
      header: 'Tệp',
      cell: ({ row }) => row.original.status === 'completed' ? <a href={exportServices.downloadUrl(row.original.id)} className="text-blue-600 underline">Tải xuống</a> : '-',
    },
  ];

  return (
    <PageContainer pageTitle="Xuất dữ liệu" pageDescription="Xuất dữ liệu và theo dõi tiến độ" pageHeaderAction={<Button onClick={() => setOpen(true)}>Tạo yêu cầu xuất</Button>}>
      <DataTable columns={columns} data={rows} searchKey="exportType" searchPlaceholder="Tìm yêu cầu xuất..." isLoading={exportsQuery.isLoading} />
      <ExportForm open={open} onOpenChange={setOpen} />
    </PageContainer>
  );
}


