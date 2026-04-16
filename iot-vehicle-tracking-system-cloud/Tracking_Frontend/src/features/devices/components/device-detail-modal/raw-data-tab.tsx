import { useMemo, useState } from 'react';
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

const SOURCE_LABELS: Record<string, string> = {
  telemetry: 'Telemetry',
  session: 'Phiên',
  error: 'Lỗi',
  command: 'Lệnh',
  'event-log': 'Event log',
  'obd-diagnostic': 'OBD',
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
  'obd-diagnostic': 'secondary',
};

const getPayloadClassName = (source: string) =>
  source === 'obd-diagnostic' ? 'max-h-52 bg-amber-500/10' : 'max-h-40 bg-muted/40';

export const RawDataTab = () => {
  const { rawFeed, eventLogsTotal } = useDeviceDetailModal();
  const [viewMode, setViewMode] = useState<'all' | 'obd'>('all');

  const obdRows = useMemo(
    () => rawFeed.filter((row) => row.source === 'obd-diagnostic'),
    [rawFeed],
  );
  const visibleRows = viewMode === 'obd' ? obdRows : rawFeed;

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
      <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap items-center gap-2">
          <span>Tổng bản ghi gộp: {rawFeed.length}</span>
          <span>•</span>
          <span>Bản ghi OBD: {obdRows.length}</span>
          <span>•</span>
          <span>Event logs hệ thống: {eventLogsTotal}</span>
        </div>
        <div className="flex gap-1 sm:ml-auto">
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'all' ? 'default' : 'outline'}
            className="h-7 px-2 text-[11px]"
            onClick={() => setViewMode('all')}
          >
            Tất cả
          </Button>
          <Button
            type="button"
            size="sm"
            variant={viewMode === 'obd' ? 'default' : 'outline'}
            className="h-7 px-2 text-[11px]"
            onClick={() => setViewMode('obd')}
          >
            Chỉ OBD
          </Button>
        </div>
      </div>

      <div className="space-y-3 sm:hidden">
        {visibleRows.length > 0 ? (
          visibleRows.map((row) => (
            <div
              key={row.id}
              className={`rounded-lg border p-3 ${
                row.source === 'obd-diagnostic' ? 'border-amber-300/60 bg-amber-500/5' : 'bg-background'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{row.event}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(row.timestamp)}
                  </p>
                </div>
                <Badge variant={SOURCE_VARIANTS[row.source] ?? 'outline'}>
                  {SOURCE_LABELS[row.source] ?? row.source}
                </Badge>
              </div>

              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {row.summary || 'Không có tóm tắt cho bản ghi này.'}
              </p>

              <details className="mt-3 rounded-md border bg-muted/20 px-3 py-2">
                <summary className="cursor-pointer text-xs font-medium text-foreground">
                  Xem payload JSON
                </summary>
                <pre
                  className={`mt-2 overflow-auto rounded-md p-2 text-[11px] leading-4 ${getPayloadClassName(
                    row.source,
                  )}`}
                >
                  {JSON.stringify(row.payload, null, 2)}
                </pre>
              </details>
            </div>
          ))
        ) : (
          <div className="rounded-lg border px-4 py-6 text-center text-xs text-muted-foreground">
            Không có bản ghi phù hợp với bộ lọc hiện tại.
          </div>
        )}
      </div>

      <div className="hidden max-h-[60dvh] overflow-auto rounded-lg border sm:block">
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
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.source === 'obd-diagnostic' ? 'bg-amber-500/5' : undefined}
                >
                  <TableCell className="align-top">{formatDateTime(row.timestamp)}</TableCell>
                  <TableCell className="align-top">
                    <Badge variant={SOURCE_VARIANTS[row.source] ?? 'outline'}>
                      {SOURCE_LABELS[row.source] ?? row.source}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top">{row.event}</TableCell>
                  <TableCell className="max-w-[360px] whitespace-pre-wrap align-top">
                    {row.summary}
                  </TableCell>
                  <TableCell className="max-w-[420px] align-top">
                    <pre
                      className={`overflow-auto rounded-md p-2 text-[11px] leading-4 ${getPayloadClassName(
                        row.source,
                      )}`}
                    >
                      {JSON.stringify(row.payload, null, 2)}
                    </pre>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-xs text-muted-foreground">
                  Không có bản ghi phù hợp với bộ lọc hiện tại.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
