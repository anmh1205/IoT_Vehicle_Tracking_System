import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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

const FILTERS = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Telemetry', value: 'telemetry' },
  { label: 'OBD', value: 'obd-diagnostic' },
  { label: 'Phiên', value: 'session' },
  { label: 'Lỗi', value: 'error' },
  { label: 'Lệnh', value: 'command' },
  { label: 'Event log', value: 'event-log' },
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
      rowItem('bb', 'Pin thiết bị', 'Pin/điện áp nuôi tracker.', payload.deviceBattery ?? payload.battery),
      rowItem('bt', 'Ắc quy xe', 'Điện áp nguồn phía xe hoặc OBD.', payload.vehicleBattery),
      rowItem('temp', 'Nhiệt độ động cơ', 'Nhiệt độ vận hành ưu tiên từ động cơ hoặc coolant.', payload.engineTemperature ?? payload.temperature),
      rowItem('err', 'Mã lỗi', 'Mã lỗi kỹ thuật được firmware gửi kèm bản tin.', payload.errorCode),
    ];
  }

  if (row.source === 'command') {
    return [
      rowItem('command', 'Lệnh', 'Tên command được cloud phát xuống thiết bị.', payload.command),
      rowItem('status', 'Trạng thái', 'Trạng thái gửi/ack hiện tại của command.', payload.status),
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
        label: 'Stored DTC',
        meaning: 'Mã lỗi đang lưu trong ECU.',
        value: stringifyCodes(snapshot?.dtcStored),
      },
      {
        code: 'dtc.pending',
        label: 'Pending DTC',
        meaning: 'Mã lỗi mới xuất hiện, đang chờ xác nhận.',
        value: stringifyCodes(snapshot?.dtcPending),
      },
      {
        code: 'dtc.permanent',
        label: 'Permanent DTC',
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
      rowItem('event_type', 'Loại sự kiện', 'Nhóm sự kiện mà backend đã ghi nhận.', payload.event_type ?? payload.topic),
      rowItem('event_code', 'Mã sự kiện', 'Mã chi tiết để truy vết log.', payload.event_code),
      rowItem('message', 'Thông điệp', 'Nội dung mô tả ngắn của log.', payload.message),
      rowItem('server_timestamp', 'Thời gian server', 'Mốc server ghi log.', payload.server_timestamp ?? payload.created_at),
      rowItem('device_id', 'Thiết bị', 'Thiết bị gắn với bản ghi log.', payload.device_id ?? payload.deviceId),
      rowItem('topic', 'Topic', 'Topic hoặc luồng phát sinh bản ghi.', payload.topic),
    ];
  }

  return Object.entries(payload)
    .slice(0, 6)
    .map(([key, value]) => rowItem(key, key, 'Trường dữ liệu thô từ payload gốc.', value));
};

const SummaryTile = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="mt-1 text-base font-semibold">{value}</p>
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
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <SummaryTile label="Bản ghi đang tải" value={String(rawFeed.length)} />
        <SummaryTile label="Telemetry" value={String(counts.telemetry)} />
        <SummaryTile label="OBD diagnostics" value={String(counts.obd)} />
        <SummaryTile label="Phiên / event log" value={`${counts.session} / ${counts.eventLog}`} />
        <SummaryTile label="Lệnh / lỗi" value={`${counts.command} / ${counts.error}`} />
        <SummaryTile label="Event logs hệ thống" value={String(eventLogsTotal)} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={filter === item.value ? 'default' : 'outline'}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr,1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Danh sách bản ghi</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[58dvh] px-4 pb-4">
              <div className="space-y-2">
                {visibleRows.length > 0 ? (
                  visibleRows.map((row) => {
                    const active = row.id === selectedId;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${active ? 'border-primary/40 bg-primary/5' : 'bg-background hover:bg-muted/40'}`}
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

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">Chi tiết bản ghi</CardTitle>
              {selectedRow ? (
                <Badge variant={SOURCE_VARIANTS[selectedRow.source] ?? 'outline'}>
                  {SOURCE_LABELS[selectedRow.source] ?? selectedRow.source}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedRow ? (
              <>
                <div>
                  <p className="text-sm font-semibold">{selectedRow.event}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(selectedRow.timestamp)}
                  </p>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {selectedRow.summary || 'Không có tóm tắt cho bản ghi này.'}
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border">
                  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)] gap-3 border-b bg-muted/30 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    <p>Mã</p>
                    <p>Ý nghĩa</p>
                    <p>Giá trị</p>
                  </div>
                  <div className="divide-y">
                    {extractMatrixRows(selectedRow).map((item) => (
                      <div
                        key={`${selectedRow.id}-${item.code}`}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,0.9fr)] gap-3 px-3 py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-mono text-xs text-foreground">{item.code}</p>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">{item.meaning}</p>
                        <p className="break-words font-medium">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border bg-slate-950 p-3 text-slate-100">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
                      Payload JSON
                    </p>
                    <span className="text-[11px] text-slate-400">Nguồn gốc giữ nguyên để đối chiếu</span>
                  </div>
                  <pre className="mt-3 max-h-[32rem] overflow-auto text-xs leading-5 text-slate-200">
                    {JSON.stringify(selectedRow.payload, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                Chọn một bản ghi ở cột trái để xem chi tiết đã được làm gọn.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

