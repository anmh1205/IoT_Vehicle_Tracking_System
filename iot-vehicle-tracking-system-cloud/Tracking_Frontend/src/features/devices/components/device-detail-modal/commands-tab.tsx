import { Badge } from '@/components/ui/badge';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
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
  if (status === 'failed') return 'destructive';
  if (status === 'indeterminate') return 'outline';
  if (status === 'sent' || status === 'accepted' || status === 'acknowledged') return 'default';
  if (status === 'pending') return 'secondary';
  return 'outline';
};

const statusLabel = (status: string) => {
  if (status === 'pending') return 'Đang chờ gửi';
  if (status === 'sent') return 'Đã gửi';
  if (status === 'accepted') return 'Thiết bị đã nhận';
  if (status === 'acknowledged') return 'Đã xác nhận';
  if (status === 'indeterminate') return 'Chưa rõ kết quả';
  if (status === 'failed') return 'Thất bại';
  return status;
};

const formatParams = (params: Record<string, unknown>) => {
  const entries = Object.entries(params ?? {});
  if (entries.length === 0) return '-';
  return entries
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
};

export const CommandsTab = () => {
  const {
    commands,
    commandsTotal,
    commandsLoadedCount,
    commandsHasMore,
    onCommandsLoadMore,
  } = useDeviceDetailModal();

  if (commands.length === 0) {
    return (
      <DeviceDetailEmptyState
        title="Chưa có lịch sử lệnh điều khiển"
        description="Lịch sử lệnh sẽ xuất hiện khi hệ thống gửi command đến thiết bị. Gửi lệnh mới từ tab Cài đặt."
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
                <TableCell className="max-w-[280px] truncate">{formatParams(command.params)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant(command.status)}>{statusLabel(command.status)}</Badge>
                </TableCell>
                <TableCell className="max-w-[320px] truncate">{command.response || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <InfiniteScrollTrigger
        hasMore={commandsHasMore}
        onLoadMore={onCommandsLoadMore}
        loadedCount={commandsLoadedCount}
        totalCount={commandsTotal}
        itemLabel="lệnh"
      />
    </div>
  );
};
