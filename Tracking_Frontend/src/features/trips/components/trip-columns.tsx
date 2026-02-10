'use client';

import Link from 'next/link';
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

export function getTripColumns(actions: { onEdit: (row: any) => void; onDelete: (row: any) => void; onStart: (id: number) => void; onEnd: (id: number) => void }): ColumnDef<any>[] {
  return [
    { accessorKey: 'tripCode', header: ({ column }) => <DataTableColumnHeader column={column} title="Mã chuyến đi" /> },
    { accessorKey: 'vehicleId', header: 'Phương tiện' },
    { accessorKey: 'driverName', header: 'Tài xế' },
    { accessorKey: 'status', header: 'Trạng thái', cell: ({ row }) => TRIP_STATUS_LABELS[row.original.status] ?? row.original.status },
    { id: 'actions', cell: ({ row }) => <div className="flex gap-1"><Button size="sm" variant="outline" asChild><Link href={`/dashboard/trips/${row.original.id}`}>Chi tiết</Link></Button><Button size="sm" variant="outline" onClick={() => actions.onEdit(row.original)}>Sửa</Button><Button size="sm" variant="outline" onClick={() => actions.onStart(row.original.id)}>Bắt đầu</Button><Button size="sm" variant="outline" onClick={() => actions.onEnd(row.original.id)}>Kết thúc</Button><Button size="sm" variant="destructive" onClick={() => actions.onDelete(row.original)}>Xóa</Button></div> },
  ];
}

