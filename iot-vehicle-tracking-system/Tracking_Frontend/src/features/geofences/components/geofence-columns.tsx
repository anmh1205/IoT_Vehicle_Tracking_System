'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
  both: 'Cả hai chiều',
};

export const getGeofenceColumns = (actions: {
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
  onManageVehicles: (row: any) => void;
}): ColumnDef<any>[] => [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tên vùng" />,
    meta: { label: 'Tên vùng' },
  },
  {
    accessorKey: 'geofenceType',
    header: 'Loại',
    meta: { label: 'Loại vùng' },
    cell: ({ row }) => GEOFENCE_TYPE_LABELS[row.original.geofenceType] ?? row.original.geofenceType,
  },
  {
    accessorKey: 'triggerOn',
    header: 'Kích hoạt',
    meta: { label: 'Kích hoạt cảnh báo' },
    cell: ({ row }) => TRIGGER_LABELS[row.original.triggerOn] ?? row.original.triggerOn,
  },
  {
    accessorKey: 'vehicleIds',
    header: 'Số xe',
    meta: { label: 'Số phương tiện đã gán' },
    cell: ({ row }) => row.original.vehicleIds?.length ?? 0,
  },
  {
    accessorKey: 'isActive',
    header: 'Trạng thái',
    meta: { label: 'Trạng thái' },
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
        {row.original.isActive ? 'Hoạt động' : 'Ngưng hoạt động'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    meta: { label: 'Thao tác' },
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" asChild>
          <Link href={`/dashboard/geofences/${row.original.id}`}>Chi tiết</Link>
        </Button>
        <Button size="sm" variant="outline" onClick={() => actions.onManageVehicles(row.original)}>
          Quản lý xe
        </Button>
        <Button size="sm" variant="outline" onClick={() => actions.onEdit(row.original)}>
          Sửa
        </Button>
        <Button size="sm" variant="destructive" onClick={() => actions.onDelete(row.original)}>
          Xóa
        </Button>
      </div>
    ),
  },
];
