import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { DeviceRawFeedRow } from '@/features/devices/types';
import { formatDateTime, formatDuration } from '@/lib/utils/date/format';
import { DeviceDetailEmptyState } from './empty-state';
import { useDeviceDetailModal } from './modal-context';
import { extractDiagnosticsSnapshotFromRow } from './obd-diagnostics';

const SOURCE_LABELS: Record<string, string> = {
  telemetry: 'Telemetry',
  session: 'Phiên',
  error: 'Lỗi',
  command: 'Lệnh',
  'event-log': 'Sự kiện',
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

const FILTERS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Telemetry', value: 'telemetry' },
  { label: 'OBD', value: 'obd-diagnostic' },
  { label: 'Phiên', value: 'session' },
  { label: 'Lỗi', value: 'error' },
  { label: 'Lệnh', value: 'command' },
  { label: 'Sự kiện', value: 'event-log' },
] as const;

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const stringifyValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'Có' : 'Không';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
};

const stringifyCodes = (value: unknown): string => {
  if (!Array.isArray(value)) {
    return '-';
  }

  const items = value
    .map((item) => (typeof item === 'string' ? item.trim().toUpperCase() : ''))
    .filter((item) => item.length > 0);
  return items.length > 0 ? items.join(', ') : '-';
};

const formatSessionCadence = (payload: Record<string, unknown>): string => {
  const uptime = Number(payload.uptime);
  const dataPoints = Number(payload.dataPointsCount ?? payload.data_points_count);

  if (!Number.isFinite(uptime) || uptime <= 0 || !Number.isFinite(dataPoints) || dataPoints <= 0) {
    return '-';
  }

  return `${formatDuration(Math.max(1, Math.round(uptime / dataPoints)))} / điểm`;
};

interface RawMatrixRow {
  code: string;
  label: string;
  meaning: string;
  value: string;
}

const rowItem = (
  code: string,
  label: string,
  meaning: string,
  value: unknown,
): RawMatrixRow => ({
  code,
  label,
  meaning,
  value: stringifyValue(value),
});

const extractMatrixRows = (row: Pick<DeviceRawFeedRow, 'source' | 'payload'>): RawMatrixRow[] => {
  const payload = toRecord(row.payload) ?? {};

  if (row.source === 'telemetry') {
    return [
      rowItem('spd', 'Tốc độ', 'Tốc độ hiện tại trong bản tin telemetry.', payload.speed),
      rowItem('lat', 'Vĩ độ', 'Tọa độ vĩ độ từ GPS.', payload.latitude),
      rowItem('lon', 'Kinh độ', 'Tọa độ kinh độ từ GPS.', payload.longitude),
      rowItem('bb', 'Pin thiết bị', 'Nguồn nuôi tracker hoặc pin backup.', payload.deviceBattery),
      rowItem('bt', 'Ắc quy xe', 'Điện áp phía xe hoặc nguồn OBD.', payload.vehicleBattery),
      rowItem(
        'temp',
        'Nhiệt độ động cơ',
        'Nhiệt độ vận hành ưu tiên từ động cơ hoặc coolant OBD.',
        payload.engineTemperature ?? payload.temperature,
      ),
      rowItem('err', 'Mã lỗi', 'Mã lỗi kỹ thuật được firmware gửi kèm bản tin.', payload.errorCode),
    ];
  }

  if (row.source === 'command') {
    return [
      rowItem('command', 'Lệnh', 'Tên command cloud phát xuống thiết bị.', payload.command),
      rowItem('status', 'Trạng thái', 'Trạng thái gửi và ACK hiện tại của command.', payload.status),
      rowItem('sent_at', 'Gửi lúc', 'Thời điểm command được phát đi.', payload.sentAt ?? payload.sent_at),
      rowItem('acked_at', 'ACK lúc', 'Thời điểm thiết bị phản hồi ACK.', payload.ackedAt ?? payload.acked_at),
    ];
  }

  if (row.source === 'error') {
    return [
      rowItem('error_code', 'Mã lỗi', 'Mã lỗi do thiết bị hoặc cloud ghi nhận.', payload.errorCode ?? payload.error_code),
      rowItem('description', 'Mô tả', 'Diễn giải lỗi để vận hành xử lý.', payload.description ?? payload.message),
      rowItem('occurred_at', 'Xảy ra lúc', 'Thời điểm lỗi phát sinh.', payload.occurredAt ?? payload.occurred_at),
      rowItem('resolved_at', 'Đã xử lý', 'Thời điểm lỗi được đóng hoặc xóa.', payload.resolvedAt ?? payload.resolved_at),
    ];
  }

  if (row.source === 'obd-diagnostic') {
    const snapshot = extractDiagnosticsSnapshotFromRow(row);

    return [
      rowItem('ble_obd_connected', 'BLE OBD', 'Trạng thái kết nối BLE tới adapter OBD.', snapshot?.bleConnected),
      rowItem('elm_ready', 'ELM ready', 'Adapter ELM đã sẵn sàng nhận PID hay chưa.', snapshot?.elmReady),
      rowItem('ecu_state', 'Trạng thái ECU', 'Kết quả làm việc hiện tại giữa adapter và ECU.', snapshot?.ecuState),
      rowItem('mil_on', 'MIL', 'Đèn báo lỗi động cơ do ECU trả về.', snapshot?.milOn),
      rowItem('rpm', 'RPM', 'Vòng tua động cơ hiện tại.', snapshot?.rpm),
      rowItem('obd_speed_kph', 'Tốc độ OBD', 'Tốc độ xe do ECU cung cấp.', snapshot?.obdSpeedKph),
      rowItem('coolant_c', 'Coolant', 'Nhiệt độ nước làm mát động cơ.', snapshot?.coolantC),
      rowItem('sample_age_ms', 'Độ trễ mẫu', 'Độ cũ của mẫu OBD gần nhất.', snapshot?.sampleAgeMs),
      {
        code: 'dtc.stored',
        label: 'DTC đang lưu',
        meaning: 'Mã lỗi hiện đang lưu trong ECU.',
        value: stringifyCodes(snapshot?.dtcStored),
      },
      {
        code: 'dtc.pending',
        label: 'DTC chờ xác nhận',
        meaning: 'Mã lỗi mới xuất hiện, đang chờ xác nhận.',
        value: stringifyCodes(snapshot?.dtcPending),
      },
      {
        code: 'dtc.permanent',
        label: 'DTC thường trực',
        meaning: 'Mã lỗi đã được ECU đánh dấu thường trực.',
        value: stringifyCodes(snapshot?.dtcPermanent),
      },
    ];
  }

  if (row.source === 'session') {
    return [
      rowItem('status', 'Trạng thái', 'Trạng thái tổng quát của phiên chạy.', payload.status),
      rowItem('server_session_start', 'Bắt đầu', 'Mốc server ghi nhận bắt đầu phiên.', payload.serverSessionStart ?? payload.server_session_start),
      rowItem('server_session_end', 'Kết thúc', 'Mốc server ghi nhận kết thúc phiên.', payload.serverSessionEnd ?? payload.server_session_end),
      rowItem('uptime', 'Uptime', 'Tổng thời lượng phiên vận hành.', payload.uptime),
      rowItem('data_points_count', 'Điểm dữ liệu', 'Số điểm telemetry thuộc phiên này.', payload.dataPointsCount ?? payload.data_points_count),
      {
        code: 'cadence',
        label: 'Chu kỳ trung bình',
        meaning: 'Khoảng thời gian trung bình giữa các điểm dữ liệu trong phiên.',
        value: formatSessionCadence(payload),
      },
    ];
  }

  if (row.source === 'event-log') {
    return [
      rowItem(
        'event_type',
        'Loại sự kiện',
        'Nhóm sự kiện mà backend đã ghi nhận.',
        payload.localized_title ?? payload.event_type ?? payload.topic,
      ),
      rowItem('event_code', 'Mã sự kiện', 'Mã chi tiết để truy vết log.', payload.event_code),
      rowItem(
        'message',
        'Thông điệp',
        'Nội dung mô tả ngắn của log.',
        payload.localized_message ?? payload.message,
      ),
      rowItem('server_timestamp', 'Thời gian server', 'Mốc server ghi log.', payload.server_timestamp ?? payload.created_at),
      rowItem('device_id', 'Thiết bị', 'Thiết bị gắn với bản ghi log.', payload.device_id ?? payload.deviceId),
      rowItem('topic', 'Topic', 'Topic hoặc luồng phát sinh bản ghi.', payload.topic),
    ];
  }

  return Object.entries(payload)
    .slice(0, 8)
    .map(([key, value]) => rowItem(key, key, 'Trường dữ liệu thô từ payload gốc.', value));
};

const SummaryPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-full border bg-background px-2.5 py-1 text-[11px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="ml-2 font-semibold text-foreground">{value}</span>
  </div>
);

export const RawDataTab = () => {
  const { rawFeed, eventLogsTotal } = useDeviceDetailModal();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      telemetry: rawFeed.filter((row) => row.source === 'telemetry').length,
      obd: rawFeed.filter((row) => row.source === 'obd-diagnostic').length,
      session: rawFeed.filter((row) => row.source === 'session').length,
      error: rawFeed.filter((row) => row.source === 'error').length,
      command: rawFeed.filter((row) => row.source === 'command').length,
      eventLog: rawFeed.filter((row) => row.source === 'event-log').length,
    }),
    [rawFeed],
  );

  const visibleRows = useMemo(() => {
    if (filter === 'all') {
      return rawFeed;
    }
    return rawFeed.filter((row) => row.source === filter);
  }, [filter, rawFeed]);

  useEffect(() => {
    if (visibleRows.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !visibleRows.some((row) => row.id === selectedId)) {
      setSelectedId(visibleRows[0].id);
    }
  }, [selectedId, visibleRows]);

  const selectedRow = visibleRows.find((row) => row.id === selectedId) ?? null;

  if (rawFeed.length === 0) {
    return (
      <DeviceDetailEmptyState
        title="Chưa có dữ liệu thô"
        description="Bảng raw feed sẽ hiển thị khi backend ghi nhận telemetry, phiên chạy, lỗi hoặc lệnh."
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="rounded-2xl border bg-muted/10 px-3 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <SummaryPill label="Bản ghi" value={String(rawFeed.length)} />
            <SummaryPill label="Telemetry" value={String(counts.telemetry)} />
            <SummaryPill label="OBD" value={String(counts.obd)} />
            <SummaryPill label="Phiên" value={String(counts.session)} />
            <SummaryPill label="Lệnh / lỗi" value={`${counts.command} / ${counts.error}`} />
            <SummaryPill label="Sự kiện" value={`${counts.eventLog} / ${eventLogsTotal}`} />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant={filter === item.value ? 'default' : 'outline'}
                className="h-7 px-2.5 text-[11px]"
                onClick={() => setFilter(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="flex min-h-0 flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Danh sách bản ghi</CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <ScrollArea className="h-full px-4 pb-4">
              <div className="space-y-2 pt-1">
                {visibleRows.length > 0 ? (
                  visibleRows.map((row) => {
                    const active = row.id === selectedId;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${active ? 'border-primary/40 bg-primary/5 shadow-sm' : 'bg-background hover:bg-muted/40'}`}
                        onClick={() => setSelectedId(row.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{row.event}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatDateTime(row.timestamp)}
                            </p>
                          </div>
                          <Badge variant={SOURCE_VARIANTS[row.source] ?? 'outline'}>
                            {SOURCE_LABELS[row.source] ?? row.source}
                          </Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {row.summary || 'Không có tóm tắt cho bản ghi này.'}
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                    Không có bản ghi phù hợp với bộ lọc hiện tại.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col">
          <CardHeader className="pb-3">
            {selectedRow ? (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base">{selectedRow.event}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(selectedRow.timestamp)}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selectedRow.summary || 'Không có tóm tắt cho bản ghi này.'}
                  </p>
                </div>
                <Badge variant={SOURCE_VARIANTS[selectedRow.source] ?? 'outline'}>
                  {SOURCE_LABELS[selectedRow.source] ?? selectedRow.source}
                </Badge>
              </div>
            ) : (
              <CardTitle className="text-base">Chi tiết bản ghi</CardTitle>
            )}
          </CardHeader>
          <CardContent className="min-h-0 flex-1">
            {selectedRow ? (
              <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.92fr)]">
                <div className="min-h-0 overflow-hidden rounded-xl border">
                  <ScrollArea className="h-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[110px]">Mã</TableHead>
                          <TableHead>Ý nghĩa</TableHead>
                          <TableHead className="w-[240px]">Giá trị</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractMatrixRows(selectedRow).map((item) => (
                          <TableRow key={`${selectedRow.id}-${item.code}`}>
                            <TableCell className="font-mono text-xs">{item.code}</TableCell>
                            <TableCell className="whitespace-normal">
                              <p className="font-medium text-foreground">{item.label}</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {item.meaning}
                              </p>
                            </TableCell>
                            <TableCell className="whitespace-normal break-words font-medium">
                              {item.value}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>

                <div className="min-h-0 rounded-xl border bg-slate-950 p-3 text-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
                      Payload JSON
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Đối chiếu payload API gốc
                    </span>
                  </div>
                  <ScrollArea className="mt-3 h-[calc(100%-2rem)]">
                    <pre className="pr-4 text-xs leading-5 text-slate-200">
                      {JSON.stringify(selectedRow.payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                Chọn một bản ghi ở cột bên trái để xem chi tiết.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

