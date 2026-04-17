import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDateTime, formatDuration } from '@/lib/utils/date/format';
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

const formatSessionCadence = (payload: Record<string, unknown>): string => {
  const uptime = Number(payload.uptime);
  const dataPoints = Number(payload.dataPointsCount ?? payload.data_points_count);

  if (!Number.isFinite(uptime) || uptime <= 0 || !Number.isFinite(dataPoints) || dataPoints <= 0) {
    return '-';
  }

  return `${formatDuration(Math.max(1, Math.round(uptime / dataPoints)))} / điểm`;
};

const extractHighlights = (row: { source: string; payload: Record<string, unknown> }) => {
  const payload = toRecord(row.payload) ?? {};

  if (row.source === 'telemetry') {
    return [
      ['Tốc độ', stringifyValue(payload.speed)],
      ['Vĩ độ', stringifyValue(payload.latitude)],
      ['Kinh độ', stringifyValue(payload.longitude)],
      ['Pin', stringifyValue(payload.battery)],
      ['Nhiệt độ', stringifyValue(payload.temperature)],
      ['Mã lỗi', stringifyValue(payload.errorCode)],
    ];
  }

  if (row.source === 'command') {
    return [
      ['Lệnh', stringifyValue(payload.command)],
      ['Trạng thái', stringifyValue(payload.status)],
      ['Gửi lúc', stringifyValue(payload.sentAt ?? payload.sent_at)],
      ['ACK lúc', stringifyValue(payload.ackedAt ?? payload.acked_at)],
    ];
  }

  if (row.source === 'error') {
    return [
      ['Mã lỗi', stringifyValue(payload.errorCode ?? payload.error_code)],
      ['Mô tả', stringifyValue(payload.description ?? payload.message)],
      ['Xảy ra lúc', stringifyValue(payload.occurredAt ?? payload.occurred_at)],
      ['Đã xử lý', stringifyValue(payload.resolvedAt ?? payload.resolved_at)],
    ];
  }

  if (row.source === 'obd-diagnostic') {
    const diagnostics =
      toRecord(payload.diagnostics) ?? toRecord(toRecord(payload.context)?.diagnostics) ?? {};
    const channel = toRecord(diagnostics.channel) ?? {};
    const signals = toRecord(diagnostics.signals) ?? {};
    const quality = toRecord(diagnostics.quality) ?? {};

    return [
      ['BLE OBD', stringifyValue(channel.ble_obd_connected)],
      ['ELM ready', stringifyValue(channel.elm_ready)],
      ['RPM', stringifyValue(signals.rpm)],
      ['Tốc độ OBD', stringifyValue(signals.obd_speed_kph)],
      ['Coolant', stringifyValue(signals.coolant_c)],
      ['Độ trễ mẫu', stringifyValue(quality.sample_age_ms)],
    ];
  }

  if (row.source === 'session') {
    return [
      ['Trạng thái', stringifyValue(payload.status)],
      ['Bắt đầu', stringifyValue(payload.serverSessionStart ?? payload.server_session_start)],
      ['Kết thúc', stringifyValue(payload.serverSessionEnd ?? payload.server_session_end)],
      ['Uptime', stringifyValue(payload.uptime)],
      ['Điểm dữ liệu', stringifyValue(payload.dataPointsCount ?? payload.data_points_count)],
      ['Nhịp ghi nhận', formatSessionCadence(payload)],
    ];
  }

  if (row.source === 'event-log') {
    return [
      ['Event type', stringifyValue(payload.event_type ?? payload.topic)],
      ['Event code', stringifyValue(payload.event_code)],
      ['Message', stringifyValue(payload.message)],
      ['Server time', stringifyValue(payload.server_timestamp ?? payload.created_at)],
      ['Device ID', stringifyValue(payload.device_id ?? payload.deviceId)],
      ['Topic', stringifyValue(payload.topic)],
    ];
  }

  return Object.entries(payload)
    .slice(0, 6)
    .map(([key, value]) => [key, stringifyValue(value)]);
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

                <div className="grid gap-3 sm:grid-cols-2">
                  {extractHighlights(selectedRow).map(([label, value]) => (
                    <div key={`${selectedRow.id}-${label}`} className="rounded-xl border bg-muted/20 px-3 py-2.5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 text-sm font-semibold break-words">{value}</p>
                    </div>
                  ))}
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
