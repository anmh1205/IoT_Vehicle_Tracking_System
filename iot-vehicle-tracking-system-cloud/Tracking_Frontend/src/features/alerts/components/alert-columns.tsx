'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getAlertSeverityLabel,
  getAlertStatusLabel,
  getAlertTypeLabel,
} from '@/lib/api/alerts';

export const getAlertColumns = (actions: {
  onAck: (id: number) => void;
  onResolve: (id: number) => void;
  onView: (row: any) => void;
}): ColumnDef<any>[] => [
  {
    accessorKey: 'title',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tiêu đề" />,
    cell: ({ row }) => (
      <div className="max-w-[32rem] min-w-0 space-y-1 whitespace-normal">
        <p className="break-words font-medium leading-5">
          {row.original.displayTitle ?? row.original.title}
        </p>
        <p className="break-words text-xs leading-5 text-muted-foreground">
          {row.original.displayMessage ?? row.original.message ?? 'Chưa có mô tả chi tiết'}
        </p>
      </div>
    ),
  },
  {
    id: 'source',
    header: 'Nguồn',
    cell: ({ row }) => (
      <div className="max-w-[16rem] min-w-0 space-y-1 whitespace-normal text-sm">
        <p className="break-words font-medium">
          {row.original.vehiclePlate ?? row.original.vehicleId ?? 'Chưa gắn xe'}
        </p>
        <p className="break-words text-xs text-muted-foreground">
          {row.original.deviceName ?? row.original.deviceId ?? 'Chưa gắn thiết bị'}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'alertType',
    header: 'Loại',
    cell: ({ row }) => (
      <span className="whitespace-normal break-words text-sm leading-5">
        {getAlertTypeLabel(row.original.alertType, String(row.original.alertType ?? ''))}
      </span>
    ),
  },
  {
    accessorKey: 'severity',
    header: 'Mức độ',
    cell: ({ row }) => (
      <Badge variant={row.original.severity === 'critical' ? 'destructive' : 'secondary'}>
        {getAlertSeverityLabel(row.original.severity, String(row.original.severity ?? ''))}
      </Badge>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    cell: ({ row }) => (
      <span className="whitespace-normal break-words text-sm leading-5">
        {getAlertStatusLabel(row.original.status, String(row.original.status ?? ''))}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => (
      <div className="flex w-full min-w-0 flex-wrap justify-start gap-1 whitespace-normal md:justify-end">
        <Button
          size="sm"
          className="whitespace-nowrap"
          variant="outline"
          onClick={() => actions.onView(row.original)}
        >
          Chi tiết
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="whitespace-nowrap"
          disabled={row.original.status !== 'active'}
          onClick={() => actions.onAck(row.original.id)}
        >
          Xác nhận
        </Button>
        <Button
          size="sm"
          className="whitespace-nowrap"
          disabled={row.original.status === 'resolved' || row.original.status === 'dismissed'}
          onClick={() => actions.onResolve(row.original.id)}
        >
          Giải quyết
        </Button>
      </div>
    ),
  },
];
