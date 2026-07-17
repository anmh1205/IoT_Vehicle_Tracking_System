'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { formatDateTime } from '@/lib/utils/date/format';
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
  onPreview: (row: any) => void;
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
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.tripCode}</p>
        <p className="text-xs text-muted-foreground">{row.original.driverName ?? 'Chưa gán tài xế'}</p>
      </div>
    ),
  },
  {
    accessorKey: 'vehiclePrimary',
    header: 'Phương tiện',
    meta: { label: 'Phương tiện' },
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.vehiclePrimary ?? row.original.vehicleId ?? 'Chưa có xe'}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.vehicleSecondary ?? row.original.deviceId ?? 'Chưa có thiết bị'}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'routeLabel',
    header: 'Lộ trình',
    meta: { label: 'Lộ trình' },
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.startLocation ?? 'Chưa có điểm đi'}</p>
        <p className="text-xs text-muted-foreground">{row.original.endLocation ?? 'Chưa có điểm đến'}</p>
      </div>
    ),
  },
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
    header: 'Thời gian',
    meta: { label: 'Thời gian' },
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {formatDateTime(row.original.actualStart ?? row.original.plannedStart, 'dd/MM HH:mm')}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.original.actualEnd
            ? `Kết thúc ${formatDateTime(row.original.actualEnd, 'dd/MM HH:mm')}`
            : row.original.plannedEnd
              ? `Dự kiến ${formatDateTime(row.original.plannedEnd, 'dd/MM HH:mm')}`
              : 'Chưa có mốc kết thúc'}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'distanceKm',
    header: 'Dữ liệu thực tế',
    meta: { label: 'Dữ liệu thực tế' },
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {row.original.distanceKm !== null && row.original.distanceKm !== undefined
            ? `${row.original.distanceKm} km`
            : 'Chưa có quãng đường'}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.original.status === 'in_progress'
            ? 'Có thể mở phát lại trực tiếp từ bảng'
            : 'Dùng bản xem trước để đối chiếu bản đồ và mốc GPS'}
        </p>
      </div>
    ),
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
          <Button size="sm" variant="outline" onClick={() => actions.onPreview(row.original)}>
            Xem nhanh
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
