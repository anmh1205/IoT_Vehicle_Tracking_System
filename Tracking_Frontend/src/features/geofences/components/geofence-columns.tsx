'use client';

import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';

const GEOFENCE_TYPE_LABELS: Record<string, string> = {
  circle: 'Hình tròn',
  polygon: 'Đa giác',
  rectangle: 'Hình chữ nhật',
};

const TRIGGER_LABELS: Record<string, string> = {
  enter: 'Khi vào',
  exit: 'Khi ra',
  both: 'Khi vào hoặc ra',
};

export function getGeofenceColumns(actions: { onEdit: (row: any) => void; onDelete: (row: any) => void }): ColumnDef<any>[] {
  return [
    { accessorKey: 'name', header: ({ column }) => <DataTableColumnHeader column={column} title="Tên" /> },
    { accessorKey: 'geofenceType', header: 'Loại', cell: ({ row }) => GEOFENCE_TYPE_LABELS[row.original.geofenceType] ?? row.original.geofenceType },
    { accessorKey: 'triggerOn', header: 'Kiểu kích hoạt', cell: ({ row }) => TRIGGER_LABELS[row.original.triggerOn] ?? row.original.triggerOn },
    { accessorKey: 'isActive', header: 'Đang hoạt động', cell: ({ row }) => (row.original.isActive ? 'Có' : 'Không') },
    { id: 'actions', cell: ({ row }) => <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => actions.onEdit(row.original)}>Sửa</Button><Button size="sm" variant="destructive" onClick={() => actions.onDelete(row.original)}>Xóa</Button></div> },
  ];
}

