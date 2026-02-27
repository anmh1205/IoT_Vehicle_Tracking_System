'use client';
import { useCallback, useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { exportServices } from '@/lib/api/exports';
import { useCreateExport } from '@/hooks/mutations/use-create-export';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { queryInvalidation } from '@/lib/utils/query-invalidation';
import { useRoleAccess } from '@/hooks/use-role-access';
import { Card, CardContent } from '@/components/ui/card';
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
const ExportForm = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  const [form, setForm] = useState({
    exportType: 'devices',
    format: 'csv',
    from: '',
    to: '',
  });
  const createMutation = useCreateExport({
    onSuccess: () => onOpenChange(false),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo yêu cầu xuất dữ liệu</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select
            value={form.exportType}
            onValueChange={(value) => setForm((state) => ({ ...state, exportType: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="devices">Thiết bị</SelectItem>
              <SelectItem value="vehicles">Phương tiện</SelectItem>
              <SelectItem value="alerts">Cảnh báo</SelectItem>
              <SelectItem value="trips">Chuyến đi</SelectItem>
              <SelectItem value="maintenance">Bảo trì</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={form.format}
            onValueChange={(value) => setForm((state) => ({ ...state, format: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="excel">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="date"
            className="w-full rounded border p-2 text-sm"
            value={form.from}
            onChange={(event) => setForm((state) => ({ ...state, from: event.target.value }))}
          />
          <input
            type="date"
            className="w-full rounded border p-2 text-sm"
            value={form.to}
            onChange={(event) => setForm((state) => ({ ...state, to: event.target.value }))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            disabled={createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                exportType: form.exportType,
                filters: {
                  format: form.format,
                  from: form.from || undefined,
                  to: form.to || undefined,
                },
              })
            }
          >
            Tạo yêu cầu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const ExportsPage = () => {
  const access = useRoleAccess();
  const [open, setOpen] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});
  const queryClient = useQueryClient();
  const exportsQuery = useQuery({
    queryKey: ['exports'],
    queryFn: () => exportServices.getList({ limit: 200 }),
  });
  const onProgress = useCallback((payload: any) => {
    const jobId = Number(payload?.jobId ?? payload?.exportId ?? payload?.id);
    if (!Number.isFinite(jobId) || jobId <= 0) {
      return;
    }
    setProgressMap((prev) => ({ ...prev, [jobId]: Number(payload?.progress ?? 0) }));
  }, []);
  const onReady = useCallback(() => {
    queryInvalidation.exports.all(queryClient);
  }, [queryClient]);
  useRealtimeSubscription({
    event: 'export:progress',
    handler: onProgress,
  });
  useRealtimeSubscription({
    event: 'export:ready',
    handler: onReady,
  });

  const rows = useMemo(() => exportsQuery.data?.items ?? [], [exportsQuery.data?.items]);

  const activeJobIds = useMemo(() => {
    const ids = rows
      .filter((row: any) => row.status === 'pending' || row.status === 'processing')
      .map((row: any) => Number(row.id))
      .filter((id: number) => Number.isFinite(id) && id > 0);
    return new Set(ids);
  }, [rows]);

  if (!access.canExportData) {
    return (
      <PageContainer pageTitle="Xuất dữ liệu" pageDescription="Khu vực hạn chế">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Bạn không có quyền truy cập phân hệ này.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'exportType',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Đối tượng" />,
      cell: ({ row }) => EXPORT_TYPE_LABELS[row.original.exportType] ?? row.original.exportType,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => STATUS_LABELS[row.original.status] ?? row.original.status,
    },
    {
      id: 'progress',
      header: 'Tiến độ',
      cell: ({ row }) => {
        const rowId = Number(row.original.id);
        const progress =
          Number.isFinite(rowId) && activeJobIds.has(rowId)
            ? (progressMap[rowId] ?? (row.original.status === 'completed' ? 100 : 0))
            : row.original.status === 'completed'
              ? 100
              : 0;
        return <Progress value={progress} />;
      },
    },
    { accessorKey: 'createdAt', header: 'Thời điểm tạo' },
    {
      id: 'download',
      header: 'Tệp',
      cell: ({ row }) =>
        row.original.status === 'completed' ? (
          <a href={exportServices.downloadUrl(row.original.id)} className="text-blue-600 underline">
            Tải xuống
          </a>
        ) : (
          '-'
        ),
    },
  ];
  return (
    <PageContainer
      pageTitle="Xuất dữ liệu"
      pageDescription="Xuất dữ liệu và theo dõi tiến độ"
      pageHeaderAction={<Button onClick={() => setOpen(true)}>Tạo yêu cầu xuất</Button>}
    >
      <DataTable
        columns={columns}
        data={rows}
        searchKey="exportType"
        searchPlaceholder="Tìm yêu cầu xuất..."
        isLoading={exportsQuery.isLoading}
      />
      <ExportForm open={open} onOpenChange={setOpen} />
    </PageContainer>
  );
};
export default ExportsPage;
