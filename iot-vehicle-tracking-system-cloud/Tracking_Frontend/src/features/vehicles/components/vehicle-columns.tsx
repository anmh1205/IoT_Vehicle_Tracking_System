'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
  maintenance: 'Đang bảo trì',
  retired: 'Ngưng khai thác',
};

const getCustomerLabel = (vehicle: any) => {
  const parts = [vehicle?.customerName, vehicle?.customerCode].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' • ');
  }

  return vehicle?.customerId ? `Khách hàng #${vehicle.customerId}` : 'Chưa gán';
};

export const getVehicleColumns = (actions: {
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
  onDetail: (row: any) => void;
  onAssign: (row: any) => void;
}): ColumnDef<any>[] => [
  {
    accessorKey: 'vehicleId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã xe" />,
    meta: { label: 'Mã xe' },
  },
  { accessorKey: 'plateNumber', header: 'Biển số', meta: { label: 'Biển số' } },
  { accessorKey: 'brand', header: 'Hãng xe', meta: { label: 'Hãng xe' } },
  { accessorKey: 'model', header: 'Dòng xe', meta: { label: 'Dòng xe' } },
  {
    id: 'customer',
    header: 'Khách hàng',
    meta: { label: 'Khách hàng' },
    cell: ({ row }) => getCustomerLabel(row.original),
  },
  {
    accessorKey: 'deviceId',
    header: 'Thiết bị gắn',
    meta: { label: 'Thiết bị gắn' },
    cell: ({ row }) => row.original.deviceId ?? 'Chưa gắn',
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    meta: { label: 'Trạng thái' },
    cell: ({ row }) => (
      <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
        {VEHICLE_STATUS_LABELS[row.original.status] ?? row.original.status}
      </Badge>
    ),
  },
  {
    id: 'actions',
    meta: { label: 'Thao tác' },
    cell: ({ row }) => (
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="outline" onClick={() => actions.onDetail(row.original)}>
          Chi tiết
        </Button>
        <Button size="sm" variant="outline" onClick={() => actions.onAssign(row.original)}>
          Gán thiết bị
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
