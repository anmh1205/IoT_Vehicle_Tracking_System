'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
  maintenance: 'Đang bảo trì',
};

export function getVehicleColumns(actions: { onEdit: (row: any) => void; onDelete: (row: any) => void; onDetail: (row: any) => void }): ColumnDef<any>[] {
  return [
    { accessorKey: 'vehicleId', header: ({ column }) => <DataTableColumnHeader column={column} title="Mã xe" /> },
    { accessorKey: 'plateNumber', header: 'Biển số' },
    { accessorKey: 'brand', header: 'Hãng xe' },
    { accessorKey: 'model', header: 'Dòng xe' },
    { accessorKey: 'customerId', header: 'Khách hàng' },
    { accessorKey: 'status', header: 'Trạng thái', cell: ({ row }) => <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>{VEHICLE_STATUS_LABELS[row.original.status] ?? row.original.status}</Badge> },
    { id: 'actions', cell: ({ row }) => <div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => actions.onDetail(row.original)}>Chi tiết</Button><Button size="sm" variant="outline" onClick={() => actions.onEdit(row.original)}>Sửa</Button><Button size="sm" variant="destructive" onClick={() => actions.onDelete(row.original)}>Xóa</Button></div> },
  ];
}

