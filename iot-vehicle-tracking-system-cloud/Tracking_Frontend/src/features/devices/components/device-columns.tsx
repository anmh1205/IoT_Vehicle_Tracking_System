'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { DEVICE_STATUS_LABELS, DEVICE_STATUS_VARIANTS } from './device-constants';
import { formatRelative } from '@/lib/utils/date/format';
import type { Device } from '../types';

const AssignmentCell = ({
  value,
  emptyLabel,
}: {
  value: string | null | undefined;
  emptyLabel: string;
}) =>
  value ? (
    <span className="font-medium text-foreground">{value}</span>
  ) : (
    <span className="text-muted-foreground">{emptyLabel}</span>
  );

export const getDeviceColumns = (actions: {
  onView: (item: Device) => void;
  onEdit: (item: Device) => void;
  onDelete: (item: Device) => void;
}): ColumnDef<Device>[] => [
  {
    accessorKey: 'deviceId',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã thiết bị" />,
  },
  {
    accessorKey: 'deviceName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tên thiết bị" />,
  },
  {
    accessorKey: 'vehiclePlate',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Xe đang gắn" />,
    cell: ({ row }) => (
      <AssignmentCell value={row.original.vehiclePlate} emptyLabel="Chưa gắn xe" />
    ),
  },
  {
    accessorKey: 'customerName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Khách hàng" />,
    cell: ({ row }) => (
      <AssignmentCell value={row.original.customerName} emptyLabel="Chưa gắn khách hàng" />
    ),
  },
  {
    accessorKey: 'currentStatus',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const current = String(row.getValue('currentStatus'));
      return (
        <Badge variant={DEVICE_STATUS_VARIANTS[current] ?? 'outline'}>
          {DEVICE_STATUS_LABELS[current] ?? current}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'lastSeenAt',
    header: 'Cập nhật',
    cell: ({ row }) => formatRelative(String(row.getValue('lastSeenAt'))),
  },
  {
    accessorKey: 'firmwareVersion',
    header: 'Firmware',
    cell: ({ row }) => row.getValue('firmwareVersion') || '-',
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => actions.onView(row.original)}>
            <Eye className="mr-2 h-4 w-4" />
            Xem chi tiết
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onEdit(row.original)}>
            <Pencil className="mr-2 h-4 w-4" />
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => actions.onDelete(row.original)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
