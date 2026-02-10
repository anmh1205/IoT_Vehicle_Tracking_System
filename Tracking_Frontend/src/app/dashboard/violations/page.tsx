'use client';

import { useQuery } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { alertServices } from '@/lib/api/alerts';
import { StatCard } from '@/components/common/stat-card';
import { AlertTriangle, Gauge, Car } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

const VIOLATION_TYPES = ['speeding', 'harsh_braking', 'idle_too_long'];
const STATUS_LABELS: Record<string, string> = { active: 'Đang hoạt động', acknowledged: 'Đã xác nhận', resolved: 'Đã giải quyết' };
const SEVERITY_LABELS: Record<string, string> = { critical: 'Nghiêm trọng', high: 'Cao', medium: 'Trung bình', low: 'Thấp' };
const VIOLATION_TYPE_LABELS: Record<string, string> = {
  speeding: 'Vượt tốc độ',
  harsh_braking: 'Phanh gấp',
  idle_too_long: 'Dừng quá lâu',
};

export default function ViolationsPage() {
  const alerts = useQuery({ queryKey: ['violations'], queryFn: () => alertServices.getList({ limit: 200, alertType: VIOLATION_TYPES.join(',') }) });
  const rows = alerts.data?.items ?? alerts.data?.data?.items ?? [];

  const stats = {
    total: rows.length,
    speeding: rows.filter((r: any) => r.alertType === 'speeding').length,
    harsh: rows.filter((r: any) => r.alertType === 'harsh_braking').length,
  };

  const columns: ColumnDef<any>[] = [
    { accessorKey: 'vehicleId', header: ({ column }) => <DataTableColumnHeader column={column} title="Phương tiện" /> },
    { accessorKey: 'alertType', header: 'Loại vi phạm', cell: ({ row }) => VIOLATION_TYPE_LABELS[row.original.alertType] ?? row.original.alertType },
    { accessorKey: 'severity', header: 'Mức độ', cell: ({ row }) => SEVERITY_LABELS[row.original.severity] ?? row.original.severity },
    { accessorKey: 'createdAt', header: 'Thời gian' },
    { accessorKey: 'status', header: 'Trạng thái', cell: ({ row }) => STATUS_LABELS[row.original.status] ?? row.original.status },
  ];

  return (
    <PageContainer pageTitle="Vi phạm" pageDescription="Lịch sử vi phạm vận hành">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Tổng vi phạm" value={stats.total} icon={<AlertTriangle className="h-4 w-4" />} isLoading={alerts.isLoading} />
        <StatCard title="Vượt tốc độ" value={stats.speeding} icon={<Gauge className="h-4 w-4" />} isLoading={alerts.isLoading} />
        <StatCard title="Phanh gấp" value={stats.harsh} icon={<Car className="h-4 w-4" />} isLoading={alerts.isLoading} />
      </div>
      <DataTable columns={columns} data={rows} searchKey="vehicleId" searchPlaceholder="Tìm biển số..." isLoading={alerts.isLoading} />
    </PageContainer>
  );
}


