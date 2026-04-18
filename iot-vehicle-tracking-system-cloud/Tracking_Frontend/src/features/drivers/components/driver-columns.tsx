'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';

const DRIVER_STATUS_LABELS: Record<string, string> = {
  active: 'Hoạt động',
  inactive: 'Ngưng hoạt động',
  suspended: 'Tạm ngưng',
};

const DRIVER_STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
};

const TRIP_STATUS_LABELS: Record<string, string> = {
  planned: 'Đã lên kế hoạch',
  in_progress: 'Đang chạy',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export const getDriverColumns = (actions: {
  onDetail: (row: any) => void;
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
}): ColumnDef<any>[] => [
  {
    accessorKey: 'driverCode',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã tài xế" />,
    meta: { label: 'Mã tài xế' },
  },
  { accessorKey: 'fullName', header: 'Họ tên', meta: { label: 'Họ tên' } },
  { accessorKey: 'phone', header: 'Số điện thoại', meta: { label: 'Số điện thoại' } },
  { accessorKey: 'licenseNumber', header: 'Số GPLX', meta: { label: 'Số GPLX' } },
  { accessorKey: 'licenseType', header: 'Hạng GPLX', meta: { label: 'Hạng GPLX' } },
  {
    id: 'assignment',
    header: 'Ngữ cảnh phân công',
    meta: { label: 'Ngữ cảnh phân công' },
    cell: ({ row }) => {
      const assignment = row.original.assignment;
      if (!assignment || (assignment.tripCount ?? 0) === 0) {
        return <span className="text-xs text-muted-foreground">Chưa ghi nhận chuyến nào</span>;
      }

      const activeVehicle = assignment.activeVehicleId ?? assignment.latestVehicleId ?? 'Chưa gán xe';
      const tripStatus =
        TRIP_STATUS_LABELS[assignment.latestTripStatus ?? ''] ?? assignment.latestTripStatus ?? 'Không rõ';

      return (
        <div className="space-y-1 text-sm">
          <p className="font-medium">{activeVehicle}</p>
          <p className="text-xs text-muted-foreground">
            {assignment.latestDeviceId ?? assignment.activeDeviceId ?? 'Chưa có thiết bị'} •{' '}
            {assignment.tripCount} chuyến • {tripStatus}
          </p>
        </div>
      );
    },
  },
  {
    accessorKey: 'status',
    header: 'Trạng thái',
    meta: { label: 'Trạng thái' },
    cell: ({ row }) => (
      <Badge variant={DRIVER_STATUS_VARIANT[row.original.status] ?? 'secondary'}>
        {DRIVER_STATUS_LABELS[row.original.status] ?? row.original.status}
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
