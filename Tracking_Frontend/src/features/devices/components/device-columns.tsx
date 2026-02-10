'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import type { Device } from '../types';

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  running: { label: 'Đang chạy', variant: 'default' },
  stopped: { label: 'Dừng', variant: 'secondary' },
  disconnected: { label: 'Mất kết nối', variant: 'destructive' },
};

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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tên" />,
  },
  {
    accessorKey: 'currentStatus',
    header: 'Trạng thái',
    cell: ({ row }) => {
      const current = String(row.getValue('currentStatus'));
      const mapped = statusMap[current] ?? { label: current, variant: 'outline' as const };
      return <Badge variant={mapped.variant}>{mapped.label}</Badge>;
    },
  },
  { accessorKey: 'firmwareVersion', header: 'Phiên bản PM nhúng' },
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => actions.onView(row.original)}><Eye className="mr-2 h-4 w-4" />Xem</DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onEdit(row.original)}><Pencil className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem>
          <DropdownMenuItem onClick={() => actions.onDelete(row.original)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

