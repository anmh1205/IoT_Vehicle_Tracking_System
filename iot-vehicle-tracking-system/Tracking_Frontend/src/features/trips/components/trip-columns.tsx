'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';

const TRIP_STATUS_LABELS: Record<string, string> = {
  planned: 'Đã lên kế hoạch',
  in_progress: 'Đang diễn ra',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
  started: 'Đã bắt đầu',
  ended: 'Đã kết thúc',
};

const TRIP_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  planned: 'secondary',
  in_progress: 'default',
  completed: 'default',
  cancelled: 'destructive',
  started: 'default',
  ended: 'secondary',
};

export const getTripColumns = (actions: {
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
  onStart: (id: number) => void;
  onEnd: (id: number) => void;
  startPendingId?: number | null;
  endPendingId?: number | null;
}): ColumnDef<any>[] => [
  {
    accessorKey: 'tripCode',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã chuyến đi" />,
    meta: { label: 'Mã chuyến đi' },
  },
  { accessorKey: 'vehicleId', header: 'Phương tiện', meta: { label: 'Phương tiện' } },
  { accessorKey: 'driverName', header: 'Tài xế', meta: { label: 'Tài xế' } },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    meta: { label: 'Trạng thái' },
    cell: ({ row }) => (
      <Badge variant={TRIP_STATUS_VARIANT[row.original.status] ?? 'secondary'}>
        {TRIP_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: 'plannedStart',
    header: 'Khởi hành dự kiến',
    meta: { label: 'Khởi hành dự kiến' },
    cell: ({ row }) =>
      row.original.plannedStart
        ? new Date(row.original.plannedStart).toLocaleString('vi-VN')
        : '--',
  },
  {
    id: 'actions',
    meta: { label: 'Thao tác' },
    cell: ({ row }) => {
      const status = row.original.status;
      const canStart = status === 'planned';
      const canEnd = status === 'in_progress' || status === 'started';

      return (
        <div className="flex flex-wrap gap-1">
          <Button size="sm" variant="outline" asChild>
            <Link href={`/dashboard/trips/${row.original.id}`}>Chi tiết</Link>
          </Button>
          <Button size="sm" variant="outline" onClick={() => actions.onEdit(row.original)}>
            Sửa
          </Button>
          {canStart ? (
            <Button
              size="sm"
              variant="outline"
              disabled={actions.startPendingId === row.original.id}
              onClick={() => actions.onStart(row.original.id)}
            >
              Bắt đầu
            </Button>
          ) : null}
          {canEnd ? (
            <Button
              size="sm"
              variant="outline"
              disabled={actions.endPendingId === row.original.id}
              onClick={() => actions.onEnd(row.original.id)}
            >
              Kết thúc
            </Button>
          ) : null}
          <Button size="sm" variant="destructive" onClick={() => actions.onDelete(row.original)}>
            Xóa
          </Button>
        </div>
      );
    },
  },
];
