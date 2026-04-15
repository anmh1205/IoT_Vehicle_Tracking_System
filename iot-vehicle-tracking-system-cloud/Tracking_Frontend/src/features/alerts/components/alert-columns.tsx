'use client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import type { ColumnDef } from '@tanstack/react-table';
const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Nghiêm trọng',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  acknowledged: 'Đã xác nhận',
  resolved: 'Đã giải quyết',
  dismissed: 'Đã bỏ qua',
};
const ALERT_TYPE_LABELS: Record<string, string> = {
  speeding: 'Vượt tốc độ',
  geofence: 'Ra/vào vùng giám sát',
  offline: 'Mất kết nối',
  maintenance: 'Bảo trì',
  other: 'Khác',
  harsh_braking: 'Phanh gấp',
  idle_too_long: 'Dừng quá lâu',
};
export const getAlertColumns = (actions: {
  onAck: (id: number) => void;
  onResolve: (id: number) => void;
  onView: (row: any) => void;
}): ColumnDef<any>[] => {
  return [
    {
      accessorKey: 'title',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tiêu đề" />,
    },
    {
      accessorKey: 'alertType',
      header: 'Loại',
      cell: ({ row }) => ALERT_TYPE_LABELS[row.original.alertType] ?? row.original.alertType,
    },
    {
      accessorKey: 'severity',
      header: 'Mức độ',
      cell: ({ row }) => (
        <Badge variant={row.original.severity === 'critical' ? 'destructive' : 'secondary'}>
          {SEVERITY_LABELS[row.original.severity] ?? row.original.severity}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => STATUS_LABELS[row.original.status] ?? row.original.status,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => actions.onView(row.original)}>
            Chi tiết
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={row.original.status !== 'active'}
            onClick={() => actions.onAck(row.original.id)}
          >
            Xác nhận
          </Button>
          <Button
            size="sm"
            disabled={row.original.status === 'resolved' || row.original.status === 'dismissed'}
            onClick={() => actions.onResolve(row.original.id)}
          >
            Giải quyết
          </Button>
        </div>
      ),
    },
  ];
};
