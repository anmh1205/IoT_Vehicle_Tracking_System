'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Car, CircleOff, Gauge, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/common/stat-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { violationServices } from '@/lib/api/violations';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { ViolationDetailModal } from '@/features/violations/components/violation-detail-modal';
import { getViolationTypeLabel, VIOLATION_TYPE_LABELS } from '@/features/violations/utils/violation-labels';

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

const ALL_TYPES = 'all';
const PAGE_SIZE = 20;

const ViolationsPage = () => {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>(ALL_TYPES);
  const [page, setPage] = useState(1);
  const [detailItem, setDetailItem] = useState<any | null>(null);

  const violations = useQuery({
    queryKey: ['violations', page, typeFilter],
    queryFn: () =>
      violationServices.getList({
        page,
        limit: PAGE_SIZE,
        ...(typeFilter !== ALL_TYPES ? { violationType: typeFilter } : {}),
      }),
  });

  const ackMutation = useMutation({
    mutationFn: (id: number) => violationServices.acknowledge(id, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['violations'] }),
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xác nhận vi phạm thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật trạng thái vi phạm.'),
      );
    },
  });

  const rows = useMemo(() => {
    return violations.data?.items ?? violations.data?.data?.items ?? [];
  }, [violations.data]);
  const pagination = violations.data?.pagination ?? violations.data?.data?.pagination;

  const stats = useMemo(
    () => ({
      total: rows.length,
      speeding: rows.filter((row: any) => row.violationType === 'speeding').length,
      harsh: rows.filter((row: any) => row.violationType === 'harsh_braking').length,
      idle: rows.filter((row: any) => row.violationType === 'idle_too_long').length,
    }),
    [rows],
  );

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'vehicleId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phương tiện" />,
      meta: { label: 'Phương tiện' },
    },
    {
      accessorKey: 'violationType',
      header: 'Loại vi phạm',
      meta: { label: 'Loại vi phạm' },
      cell: ({ row }) => getViolationTypeLabel(row.original.violationType),
    },
    {
      accessorKey: 'severity',
      header: 'Mức độ',
      meta: { label: 'Mức độ' },
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.severity === 'critical' || row.original.severity === 'high'
              ? 'destructive'
              : 'secondary'
          }
        >
          {SEVERITY_LABELS[row.original.severity] ?? row.original.severity}
        </Badge>
      ),
    },
    { accessorKey: 'createdAt', header: 'Thời gian', meta: { label: 'Thời gian' } },
    {
      accessorKey: 'acknowledged',
      header: 'Trạng thái',
      meta: { label: 'Trạng thái' },
      cell: ({ row }) =>
        row.original.acknowledged ? (
          <Badge variant="outline">Đã xác nhận</Badge>
        ) : (
          <Badge variant="default">Chưa xử lý</Badge>
        ),
    },
    {
      id: 'actions',
      header: '',
      meta: { label: 'Thao tác' },
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" onClick={() => setDetailItem(row.original)}>
            Chi tiết
          </Button>
          {!row.original.acknowledged ? (
            <Button
              size="sm"
              variant="outline"
              disabled={ackMutation.isPending}
              onClick={() => ackMutation.mutate(row.original.id)}
            >
              {ackMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Xác nhận
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <PageContainer pageTitle="Vi phạm" pageDescription="Lịch sử vi phạm vận hành">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng vi phạm"
          value={stats.total}
          icon={<AlertTriangle className="h-4 w-4" />}
          isLoading={violations.isLoading}
        />
        <StatCard
          title="Vượt tốc độ"
          value={stats.speeding}
          icon={<Gauge className="h-4 w-4" />}
          isLoading={violations.isLoading}
        />
        <StatCard
          title="Phanh gấp"
          value={stats.harsh}
          icon={<Car className="h-4 w-4" />}
          isLoading={violations.isLoading}
        />
        <StatCard
          title="Dừng quá lâu"
          value={stats.idle}
          icon={<CircleOff className="h-4 w-4" />}
          isLoading={violations.isLoading}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        searchKey="vehicleId"
        searchLabel="Tìm vi phạm theo phương tiện"
        searchPlaceholder="Tìm biển số hoặc mã xe..."
        isLoading={violations.isLoading}
        onRowClick={setDetailItem}
        toolbar={
          <div className="w-full sm:w-auto">
            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setPage(1);
                setTypeFilter(value);
              }}
            >
              <SelectTrigger aria-label="Lọc theo loại vi phạm" className="sm:w-[14rem]">
                <SelectValue placeholder="Loại vi phạm" />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectItem value={ALL_TYPES}>Tất cả loại vi phạm</SelectItem>
                {Object.entries(VIOLATION_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Trang {pagination?.page ?? page} / {Math.max(pagination?.totalPages ?? 1, 1)}. Hiển thị{' '}
          {rows.length} vi phạm trên tổng {pagination?.total ?? rows.length} bản ghi.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Trang trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.max(pagination?.totalPages ?? 1, 1)}
            onClick={() => setPage((value) => value + 1)}
          >
            Trang sau
          </Button>
        </div>
      </div>

      <ViolationDetailModal
        open={Boolean(detailItem)}
        onOpenChange={(value) => !value && setDetailItem(null)}
        violationId={detailItem?.id ?? null}
      />
    </PageContainer>
  );
};

export default ViolationsPage;
