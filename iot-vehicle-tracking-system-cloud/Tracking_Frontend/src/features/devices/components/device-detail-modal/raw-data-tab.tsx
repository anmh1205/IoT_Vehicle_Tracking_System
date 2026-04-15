import { Badge } from '@/components/ui/badge';
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

const SOURCE_LABELS: Record<string, string> = {
  telemetry: 'Telemetry',
  session: 'Phiên',
  error: 'Lỗi',
  command: 'Lệnh',
  'event-log': 'Event log',
};

const SOURCE_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  telemetry: 'default',
  session: 'outline',
  error: 'destructive',
  command: 'secondary',
  'event-log': 'outline',
};

export const RawDataTab = () => {
  const { rawFeed, eventLogsTotal } = useDeviceDetailModal();

  if (rawFeed.length === 0) {
    return (
      <DeviceDetailEmptyState
        title="Chưa có dữ liệu thô"
        description="Bảng raw feed sẽ hiển thị khi backend ghi nhận telemetry, phiên chạy, lỗi hoặc lệnh."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Tổng bản ghi gộp: {rawFeed.length}</span>
        <span>•</span>
        <span>Event logs hệ thống: {eventLogsTotal}</span>
      </div>

      <div className="max-h-[60dvh] overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-background">
            <TableRow>
              <TableHead>Thời gian</TableHead>
              <TableHead>Nguồn</TableHead>
              <TableHead>Sự kiện</TableHead>
              <TableHead>Tóm tắt</TableHead>
              <TableHead>Dữ liệu</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rawFeed.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="align-top">{formatDateTime(row.timestamp)}</TableCell>
                <TableCell className="align-top">
                  <Badge variant={SOURCE_VARIANTS[row.source] ?? 'outline'}>
                    {SOURCE_LABELS[row.source] ?? row.source}
                  </Badge>
                </TableCell>
                <TableCell className="align-top">{row.event}</TableCell>
                <TableCell className="max-w-[320px] align-top">{row.summary}</TableCell>
                <TableCell className="max-w-[420px] align-top">
                  <pre className="max-h-28 overflow-auto rounded-md bg-muted/40 p-2 text-[11px] leading-4">
                    {JSON.stringify(row.payload, null, 2)}
                  </pre>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
