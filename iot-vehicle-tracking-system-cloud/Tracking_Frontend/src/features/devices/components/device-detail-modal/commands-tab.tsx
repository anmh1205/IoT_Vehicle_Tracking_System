import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils/date/format';
import { DeviceDetailEmptyState } from './empty-state';
import { useDeviceDetailModal } from './modal-context';

const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'failed') {
    return 'destructive';
  }
  if (status === 'sent' || status === 'acknowledged') {
    return 'default';
  }
  if (status === 'pending') {
    return 'secondary';
  }
  return 'outline';
};

const formatParams = (params: Record<string, unknown>) => {
  const entries = Object.entries(params ?? {});
  if (entries.length === 0) {
    return '-';
  }
  return entries
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
};

export const CommandsTab = () => {
  const { commands, commandsPage, commandsTotalPages, commandsTotal, onCommandsPageChange } =
    useDeviceDetailModal();

  if (commands.length === 0) {
    return (
      <DeviceDetailEmptyState
        title="Chưa có lệnh điều khiển"
        description="Lịch sử lệnh sẽ xuất hiện khi hệ thống gửi command đến thiết bị."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thời điểm gửi</TableHead>
              <TableHead>Lệnh</TableHead>
              <TableHead>Tham số</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Phản hồi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commands.map((command) => (
              <TableRow key={command.id}>
                <TableCell>{formatDateTime(command.sentAt)}</TableCell>
                <TableCell className="font-medium">{command.command || '-'}</TableCell>
                <TableCell className="max-w-[280px] truncate">
                  {formatParams(command.params)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(command.status)}>{command.status}</Badge>
                </TableCell>
                <TableCell className="max-w-[320px] truncate">{command.response || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Tổng lệnh: {commandsTotal}</p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={commandsPage <= 1}
            onClick={() => onCommandsPageChange(commandsPage - 1)}
          >
            Trang trước
          </Button>
          <span className="text-xs text-muted-foreground">
            Trang {commandsPage} / {commandsTotalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={commandsPage >= commandsTotalPages}
            onClick={() => onCommandsPageChange(commandsPage + 1)}
          >
            Trang sau
          </Button>
        </div>
      </div>
    </div>
  );
};
