'use client';

import { useCallback, useMemo, useState } from 'react';
import { CircleCheckBig, CircleDashed, CircleX, Download, FileDown, ShieldAlert } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { StatCard } from '@/components/common/stat-card';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
  statistics: 'Thống kê',
};

const ExportForm = ({
  open,
  onOpenChange,
  onCreateSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreateSuccess?: () => void;
}) => {
  const [form, setForm] = useState({
    exportType: 'devices',
    format: 'csv',
    from: '',
    to: '',
  });
  const createMutation = useCreateExport({
    onSuccess: () => {
      onCreateSuccess?.();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tạo yêu cầu xuất dữ liệu</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="export-type">Đối tượng xuất</Label>
            <Select value={form.exportType} onValueChange={(value) => setForm((state) => ({ ...state, exportType: value }))}>
              <SelectTrigger id="export-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="devices">Thiết bị</SelectItem>
                <SelectItem value="vehicles">Phương tiện</SelectItem>
                <SelectItem value="alerts">Cảnh báo</SelectItem>
                <SelectItem value="trips">Chuyến đi</SelectItem>
                <SelectItem value="maintenance">Bảo trì</SelectItem>
                <SelectItem value="statistics">Thống kê</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-format">Định dạng tệp</Label>
            <Select value={form.format} onValueChange={(value) => setForm((state) => ({ ...state, format: value }))}>
              <SelectTrigger id="export-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="export-form-from-date">Từ ngày</Label>
              <Input
                id="export-form-from-date"
                type="date"
                value={form.from}
                onChange={(event) => setForm((state) => ({ ...state, from: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="export-form-to-date">Đến ngày</Label>
              <Input
                id="export-form-to-date"
                type="date"
                value={form.to}
                onChange={(event) => setForm((state) => ({ ...state, to: event.target.value }))}
              />
            </div>
          </div>
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'failed'>('all');
  const [progressMap, setProgressMap] = useState<Record<number, number>>({});
  const queryClient = useQueryClient();

  const resetListView = () => {
    setSearch('');
    setStatusFilter('all');
  };

  const exportsQuery = useQuery({
    queryKey: ['exports'],
    queryFn: () => exportServices.getList(),
  });

  const onProgress = useCallback((payload: any) => {
    const jobId = Number(payload?.jobId ?? payload?.exportId ?? payload?.id);
    if (!Number.isFinite(jobId) || jobId <= 0) return;

    setProgressMap((prev) => ({ ...prev, [jobId]: Number(payload?.progress ?? 0) }));
  }, []);

  const onReady = useCallback(() => {
    queryInvalidation.exports.all(queryClient);
  }, [queryClient]);

  useRealtimeSubscription({ namespace: 'exports', event: 'export:progress', handler: onProgress });
  useRealtimeSubscription({ namespace: 'exports', event: 'export:ready', handler: onReady });

  const rows = useMemo(() => exportsQuery.data?.items ?? [], [exportsQuery.data?.items]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
        const haystack = `${row.exportType} ${row.status} ${row.createdAt}`.toLowerCase();
        const matchesSearch = !search.trim() || haystack.includes(search.trim().toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    [rows, search, statusFilter],
  );

  const activeJobIds = useMemo(() => {
    const ids = rows
      .filter((row) => row.status === 'pending' || row.status === 'processing')
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    return new Set(ids);
  }, [rows]);

  const stats = useMemo(() => {
    const pending = rows.filter((row) => row.status === 'pending').length;
    const processing = rows.filter((row) => row.status === 'processing').length;
    const completed = rows.filter((row) => row.status === 'completed').length;
    const failed = rows.filter((row) => row.status === 'failed').length;
    return {
      total: rows.length,
      pending,
      processing,
      completed,
      failed,
    };
  }, [rows]);

  const latestCompleted = useMemo(
    () => rows.find((row) => row.status === 'completed'),
    [rows],
  );

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
      meta: { label: 'Đối tượng xuất' },
      cell: ({ row }) => EXPORT_TYPE_LABELS[row.original.exportType] ?? row.original.exportType,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      meta: { label: 'Trạng thái' },
      cell: ({ row }) => STATUS_LABELS[row.original.status] ?? row.original.status,
    },
    {
      id: 'progress',
      header: 'Tiến độ',
      meta: { label: 'Tiến độ' },
      cell: ({ row }) => {
        const rowId = Number(row.original.id);
        const progress =
          Number.isFinite(rowId) && activeJobIds.has(rowId)
            ? progressMap[rowId] ?? (row.original.status === 'completed' ? 100 : 0)
            : row.original.status === 'completed'
              ? 100
              : 0;
        return <Progress value={progress} />;
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Thời điểm tạo',
      meta: { label: 'Thời điểm tạo' },
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleString('vi-VN'),
    },
    {
      id: 'download',
      header: 'Kết quả',
      meta: { label: 'Kết quả' },
      cell: ({ row }) =>
        row.original.status === 'completed' ? (
          <Button variant="outline" size="sm" asChild>
            <a href={exportServices.downloadUrl(row.original.id)}>
              <Download className="mr-2 h-4 w-4" />
              Tải xuống
            </a>
          </Button>
        ) : row.original.status === 'failed' ? (
          <span className="text-sm text-destructive">Xuất thất bại</span>
        ) : (
          <span className="text-sm text-muted-foreground">Chưa sẵn sàng</span>
        ),
    },
  ];

  return (
    <PageContainer
      pageTitle="Xuất dữ liệu"
      pageDescription="Tạo yêu cầu xuất, theo dõi tiến độ xử lý và tải xuống kết quả hoàn tất"
      pageHeaderAction={<Button onClick={() => setOpen(true)}>Tạo yêu cầu xuất</Button>}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Tổng yêu cầu" value={stats.total} icon={<FileDown className="h-4 w-4" />} isLoading={exportsQuery.isLoading} />
        <StatCard title="Đang chờ" value={stats.pending} icon={<CircleDashed className="h-4 w-4" />} isLoading={exportsQuery.isLoading} />
        <StatCard title="Đang xử lý" value={stats.processing} icon={<CircleDashed className="h-4 w-4" />} isLoading={exportsQuery.isLoading} />
        <StatCard title="Hoàn tất" value={stats.completed} icon={<CircleCheckBig className="h-4 w-4" />} isLoading={exportsQuery.isLoading} />
        <StatCard title="Thất bại" value={stats.failed} icon={<CircleX className="h-4 w-4" />} isLoading={exportsQuery.isLoading} />
      </div>

      {latestCompleted ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kết quả hoàn tất mới nhất</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {EXPORT_TYPE_LABELS[latestCompleted.exportType] ?? latestCompleted.exportType}
              </p>
              <p className="text-muted-foreground">
                Hoàn tất lúc {latestCompleted.completedAt ? new Date(latestCompleted.completedAt).toLocaleString('vi-VN') : new Date(latestCompleted.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
            <Button asChild>
              <a href={exportServices.downloadUrl(latestCompleted.id)}>
                <Download className="mr-2 h-4 w-4" />
                Tải tệp mới nhất
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        columns={columns}
        data={filteredRows}
        pagination={false}
        isLoading={exportsQuery.isLoading}
        emptyTitle="Chưa có yêu cầu xuất phù hợp"
        emptyDescription="Hãy tạo yêu cầu mới hoặc nới bộ lọc để xem hàng đợi gần đây."
        emptyAction={{ label: 'Tạo yêu cầu xuất', onClick: () => setOpen(true) }}
        toolbar={
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:flex-nowrap">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo loại xuất hoặc trạng thái..."
              className="w-full sm:max-w-sm"
            />
            <Select value={statusFilter} onValueChange={(value: 'all' | 'pending' | 'processing' | 'completed' | 'failed') => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="pending">Đang chờ</SelectItem>
                <SelectItem value="processing">Đang xử lý</SelectItem>
                <SelectItem value="completed">Hoàn tất</SelectItem>
                <SelectItem value="failed">Thất bại</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <ExportForm open={open} onOpenChange={setOpen} onCreateSuccess={resetListView} />
    </PageContainer>
  );
};

export default ExportsPage;
