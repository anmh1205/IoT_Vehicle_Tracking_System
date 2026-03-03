'use client';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { violationServices } from '@/lib/api/violations';
import { StatCard } from '@/components/common/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Gauge, Car, CircleOff } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};
const VIOLATION_TYPE_LABELS: Record<string, string> = {
  speeding: 'Vượt tốc độ',
  harsh_braking: 'Phanh gấp',
  idle_too_long: 'Dừng quá lâu',
  geofence_enter: 'Vào vùng cấm',
  geofence_exit: 'Rời vùng giám sát',
};

const ViolationsPage = () => {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string | undefined>(undefined);

  const violations = useQuery({
    queryKey: ['violations', typeFilter],
    queryFn: () =>
      violationServices.getList({
        limit: 200,
        ...(typeFilter ? { violationType: typeFilter } : {}),
      }),
  });

  const ackMutation = useMutation({
    mutationFn: (id: number) => violationServices.acknowledge(id, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['violations'] }),
  });

  const rows = useMemo(() => {
    const list = violations.data?.items ?? violations.data?.data?.items ?? [];
    return list;
  }, [violations.data]);

  const stats = useMemo(() => ({
    total: rows.length,
    speeding: rows.filter((r: any) => r.violationType === 'speeding').length,
    harsh: rows.filter((r: any) => r.violationType === 'harsh_braking').length,
    idle: rows.filter((r: any) => r.violationType === 'idle_too_long').length,
  }), [rows]);

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'vehicleId',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Phương tiện" />,
    },
    {
      accessorKey: 'violationType',
      header: 'Loại vi phạm',
      cell: ({ row }) =>
        VIOLATION_TYPE_LABELS[row.original.violationType] ?? row.original.violationType,
    },
    {
      accessorKey: 'severity',
      header: 'Mức độ',
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
    { accessorKey: 'createdAt', header: 'Thời gian' },
    {
      accessorKey: 'acknowledged',
      header: 'Trạng thái',
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
      cell: ({ row }) =>
        !row.original.acknowledged ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => ackMutation.mutate(row.original.id)}
          >
            Xác nhận
          </Button>
        ) : null,
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
        searchPlaceholder="Tìm biển số..."
        isLoading={violations.isLoading}
      />
    </PageContainer>
  );
};
export default ViolationsPage;
