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
import { cn } from '@/lib/utils';
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
  { label: 'Rawdata device', value: 'rawdata' },
  { label: 'Telemetry', value: 'telemetry' },
  { label: 'OBD', value: 'obd-diagnostic' },
  { label: 'Phiên', value: 'session' },
  { label: 'Lỗi', value: 'error' },
  { label: 'Lệnh', value: 'command' },
  { label: 'Event log hệ thống', value: 'event-log' },
] as const;

type RawFeedFilter = (typeof FILTERS)[number]['value'];
type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const compactRecord = (entries: Array<[string, unknown]>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  entries.forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  });

  return result;
};

const omitAuthToken = (payload: Record<string, unknown>): Record<string, unknown> => {
  const { auth_token: _authToken, authToken: _authTokenCamel, ...safePayload } = payload;
  return safePayload;
};

const toFirmwareTimestamp = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.length > 0) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const normalizeCanonicalFirmwarePayload = (
  payload: Record<string, unknown>,
): Record<string, unknown> => {
  const sanitizedPayload = omitAuthToken(payload);
  const data = toRecord(sanitizedPayload.data) ?? {};
  const diagnostics = toRecord(sanitizedPayload.diagnostics);
  const metadata = toRecord(sanitizedPayload.metadata);
  const state = toRecord(sanitizedPayload.state);

  return compactRecord([
    ['device_id', sanitizedPayload.device_id ?? sanitizedPayload.deviceId],
    ['timestamp', toFirmwareTimestamp(sanitizedPayload.timestamp)],
    ['uptime', sanitizedPayload.uptime],
    ['data', compactRecord([
      ['vibration', data.vibration],
      ['vehicle_battery', data.vehicle_battery],
      ['device_battery', data.device_battery],
      ['latitude', data.latitude],
      ['longitude', data.longitude],
      ['speed', data.speed],
      ['course', data.course],
      ['satellites', data.satellites],
      ['ignition', data.ignition],
      ['error_code', data.error_code],
    ])],
    ['diagnostics', diagnostics && Object.keys(diagnostics).length > 0 ? diagnostics : undefined],
    ['state', state && Object.keys(state).length > 0 ? state : undefined],
    ['metadata', metadata && Object.keys(metadata).length > 0 ? metadata : undefined],
  ]);
};

const extractFirmwareRawPayload = (
  row: Pick<DeviceRawFeedRow, 'timestamp' | 'payload'>,
): Record<string, unknown> | null => {
  const payload = toRecord(row.payload) ?? {};
  const context = toRecord(payload.context);
  const storedRawPayload = toRecord(context?.raw_payload) ?? toRecord(payload.raw_payload);

  if (storedRawPayload) {
    return normalizeCanonicalFirmwarePayload(storedRawPayload);
  }

  const eventCode = String(payload.event_code ?? '').trim().toLowerCase();
  const source = String(context?.source ?? payload.source ?? '').trim().toLowerCase();

  if (eventCode !== 'mqtt_bridge_rawdata' && source !== 'mqtt_bridge_rawdata') {
    return null;
  }

  const metadata = toRecord(payload.metadata);
  const diagnostics = toRecord(context?.diagnostics ?? payload.diagnostics);
  const data = compactRecord([
    ['vibration', context?.vibration],
    ['vehicle_battery', context?.vehicle_battery],
    ['device_battery', context?.device_battery],
    ['latitude', context?.latitude],
    ['longitude', context?.longitude],
    ['speed', context?.speed],
    ['course', context?.course],
    ['satellites', context?.satellites],
    ['ignition', context?.ignition],
    ['error_code', context?.error_code],
  ]);

  return compactRecord([
    ['device_id', payload.device_id ?? payload.deviceId],
    ['timestamp', toFirmwareTimestamp(payload.device_timestamp ?? row.timestamp)],
    ['data', data],
    ['diagnostics', diagnostics ?? undefined],
    ['metadata', metadata && Object.keys(metadata).length > 0 ? metadata : undefined],
  ]);
};

const isMqttRawDataRow = (row: Pick<DeviceRawFeedRow, 'timestamp' | 'payload'>): boolean =>
  extractFirmwareRawPayload(row) !== null;

const rowHasObdDiagnostics = (row: Pick<DeviceRawFeedRow, 'source' | 'timestamp' | 'payload'>): boolean => {
  if (row.source === 'obd-diagnostic') {
    return true;
  }

  const firmwarePayload = extractFirmwareRawPayload(row);
  return Boolean(toRecord(firmwarePayload?.diagnostics));
};

const rowMatchesFilter = (row: DeviceRawFeedRow, filter: RawFeedFilter): boolean => {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'rawdata') {
    return isMqttRawDataRow(row);
  }

  if (filter === 'telemetry') {
    return row.source === 'telemetry';
  }

  if (filter === 'obd-diagnostic') {
    return rowHasObdDiagnostics(row);
  }

  if (filter === 'event-log') {
    return row.source === 'event-log' || row.source === 'obd-diagnostic';
  }

  return row.source === filter;
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

const extractFirmwareRawMatrixRows = (
  row: Pick<DeviceRawFeedRow, 'timestamp' | 'payload'>,
): RawMatrixRow[] | null => {
  const firmwarePayload = extractFirmwareRawPayload(row);
  if (!firmwarePayload) {
    return null;
  }

  const data = toRecord(firmwarePayload.data) ?? {};
  const diagnostics = toRecord(firmwarePayload.diagnostics);
  const channel = toRecord(diagnostics?.channel);
  const signals = toRecord(diagnostics?.signals);
  const quality = toRecord(diagnostics?.quality);
  const dtc = toRecord(diagnostics?.dtc);

  return [
    rowItem('device_id', 'Thiết bị', 'Mã thiết bị trong payload rawdata firmware.', firmwarePayload.device_id),
    rowItem('timestamp', 'Timestamp firmware', 'Mốc thời gian firmware gửi lên, đơn vị millisecond.', firmwarePayload.timestamp),
    rowItem('data.vibration', 'Rung', 'Giá trị rung từ payload data.', data.vibration),
    rowItem('data.vehicle_battery', 'Ắc quy xe', 'Điện áp nguồn chính/ắc quy xe từ firmware.', data.vehicle_battery),
    rowItem('data.device_battery', 'Pin thiết bị', 'Điện áp tracker hoặc pin backup từ firmware.', data.device_battery),
    rowItem('data.latitude', 'Vĩ độ', 'Tọa độ vĩ độ GNSS từ firmware.', data.latitude),
    rowItem('data.longitude', 'Kinh độ', 'Tọa độ kinh độ GNSS từ firmware.', data.longitude),
    rowItem('data.speed', 'Tốc độ GNSS', 'Tốc độ GNSS trong payload data.', data.speed),
    rowItem('data.course', 'Hướng di chuyển', 'Course/heading GNSS trong payload data.', data.course),
    rowItem('data.satellites', 'Vệ tinh', 'Số vệ tinh GNSS firmware báo cáo.', data.satellites),
    rowItem('data.ignition', 'Ignition', 'Trạng thái đánh lửa firmware gửi lên.', data.ignition),
    rowItem('data.error_code', 'Mã lỗi thiết bị', 'Mã lỗi kỹ thuật trong payload data.', data.error_code),
    rowItem('diagnostics.channel.ble_obd_connected', 'BLE OBD', 'Trạng thái kết nối BLE tới adapter OBD.', channel?.ble_obd_connected),
    rowItem('diagnostics.channel.elm_ready', 'ELM ready', 'Adapter ELM đã sẵn sàng nhận PID hay chưa.', channel?.elm_ready),
    rowItem('diagnostics.channel.ecu_state', 'Trạng thái ECU', 'Trạng thái ECU firmware ghi nhận.', channel?.ecu_state),
    rowItem('diagnostics.signals.rpm', 'RPM', 'Vòng tua động cơ trong diagnostics.signals.', signals?.rpm),
    rowItem('diagnostics.signals.obd_speed_kph', 'Tốc độ OBD', 'Tốc độ xe do ECU cung cấp.', signals?.obd_speed_kph),
    rowItem('diagnostics.signals.coolant_c', 'Coolant', 'Nhiệt độ nước làm mát động cơ.', signals?.coolant_c),
    rowItem('diagnostics.signals.engine_load_pct', 'Tải động cơ', 'Engine load do ECU cung cấp.', signals?.engine_load_pct),
    rowItem('diagnostics.quality.sample_age_ms', 'Độ trễ mẫu', 'Độ cũ của mẫu OBD gần nhất.', quality?.sample_age_ms),
    rowItem('diagnostics.mil_on', 'MIL', 'Đèn báo lỗi động cơ do ECU trả về.', diagnostics?.mil_on),
    rowItem('diagnostics.reported_dtc_count', 'Số DTC báo cáo', 'Tổng số mã lỗi ECU báo cáo.', diagnostics?.reported_dtc_count),
    {
      code: 'diagnostics.dtc.stored',
      label: 'DTC đang lưu',
      meaning: 'Mã lỗi hiện đang lưu trong ECU.',
      value: stringifyCodes(dtc?.stored),
    },
    {
      code: 'diagnostics.dtc.pending',
      label: 'DTC chờ xác nhận',
      meaning: 'Mã lỗi mới xuất hiện, đang chờ xác nhận.',
      value: stringifyCodes(dtc?.pending),
    },
    {
      code: 'diagnostics.dtc.permanent',
      label: 'DTC thường trực',
      meaning: 'Mã lỗi đã được ECU đánh dấu thường trực.',
      value: stringifyCodes(dtc?.permanent),
    },
  ];
};

const extractMatrixRows = (
  row: Pick<DeviceRawFeedRow, 'source' | 'timestamp' | 'payload'>,
): RawMatrixRow[] => {
  const rawMatrixRows = extractFirmwareRawMatrixRows(row);
  if (rawMatrixRows) {
    return rawMatrixRows;
  }

  const payload = toRecord(row.payload) ?? {};

  if (row.source === 'telemetry') {
    return [
      rowItem('speed', 'Tốc độ', 'Tốc độ hiện tại trong bản tin telemetry.', payload.speed),
      rowItem('latitude', 'Vĩ độ', 'Tọa độ vĩ độ từ GPS.', payload.latitude),
      rowItem('longitude', 'Kinh độ', 'Tọa độ kinh độ từ GPS.', payload.longitude),
      rowItem('deviceBattery', 'Pin thiết bị', 'Nguồn nuôi tracker hoặc pin backup.', payload.deviceBattery),
      rowItem('vehicleBattery', 'Ắc quy xe', 'Điện áp phía xe hoặc nguồn OBD.', payload.vehicleBattery),
      rowItem(
        'temperature',
        'Nhiệt độ động cơ',
        'Nhiệt độ vận hành ưu tiên từ động cơ hoặc coolant OBD.',
        payload.engineTemperature ?? payload.temperature,
      ),
      rowItem('errorCode', 'Mã lỗi', 'Mã lỗi kỹ thuật được firmware gửi kèm bản tin.', payload.errorCode),
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
      rowItem('errorCode', 'Mã lỗi', 'Mã lỗi do thiết bị hoặc cloud ghi nhận.', payload.errorCode),
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

const SummaryPill = ({
  active,
  label,
  onClick,
  value,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  value: string;
}) => (
  <button
    type="button"
    aria-pressed={active}
    className={cn(
      'rounded-full border px-2.5 py-1 text-[11px] transition-colors hover:border-primary/50 hover:bg-primary/10',
      active ? 'border-primary/50 bg-primary/15' : 'bg-background',
    )}
    onClick={onClick}
  >
    <span className="text-muted-foreground">{label}</span>
    <span className="ml-2 font-semibold text-foreground">{value}</span>
  </button>
);

const getSourceBadges = (row: DeviceRawFeedRow): Array<{ label: string; variant: BadgeVariant }> => {
  if (isMqttRawDataRow(row)) {
    return [
      { label: 'Rawdata device', variant: 'default' },
      { label: 'Event log', variant: 'outline' },
    ];
  }

  if (row.source === 'obd-diagnostic') {
    return [
      { label: 'OBD', variant: 'secondary' },
      { label: 'Event log', variant: 'outline' },
    ];
  }

  return [
    {
      label: SOURCE_LABELS[row.source] ?? row.source,
      variant: SOURCE_VARIANTS[row.source] ?? 'outline',
    },
  ];
};

const JsonPayloadPanel = ({
  className,
  payload,
  subtitle,
  title,
}: {
  className?: string;
  payload: unknown;
  subtitle: string;
  title: string;
}) => (
  <div className={cn('min-h-0 rounded-xl border bg-slate-950 p-3 text-slate-100', className)}>
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-300">
        {title}
      </p>
      <span className="text-right text-[11px] text-slate-400">{subtitle}</span>
    </div>
    <ScrollArea className="mt-3 h-[calc(100%-2rem)]">
      <pre className="pr-4 text-xs leading-5 text-slate-200">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </ScrollArea>
  </div>
);

export const RawDataTab = () => {
  const { rawFeed, eventLogsTotal } = useDeviceDetailModal();
  const [filter, setFilter] = useState<RawFeedFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      rawdata: rawFeed.filter((row) => rowMatchesFilter(row, 'rawdata')).length,
      telemetry: rawFeed.filter((row) => rowMatchesFilter(row, 'telemetry')).length,
      obd: rawFeed.filter((row) => rowMatchesFilter(row, 'obd-diagnostic')).length,
      session: rawFeed.filter((row) => rowMatchesFilter(row, 'session')).length,
      error: rawFeed.filter((row) => rowMatchesFilter(row, 'error')).length,
      command: rawFeed.filter((row) => rowMatchesFilter(row, 'command')).length,
      eventLog: rawFeed.filter((row) => rowMatchesFilter(row, 'event-log')).length,
    }),
    [rawFeed],
  );

  const visibleRows = useMemo(() => {
    return rawFeed.filter((row) => rowMatchesFilter(row, filter));
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
  const selectedFirmwarePayload = selectedRow ? extractFirmwareRawPayload(selectedRow) : null;

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
            <SummaryPill
              active={filter === 'all'}
              label="Bản ghi"
              value={String(rawFeed.length)}
              onClick={() => setFilter('all')}
            />
            <SummaryPill
              active={filter === 'rawdata'}
              label="Rawdata device"
              value={String(counts.rawdata)}
              onClick={() => setFilter('rawdata')}
            />
            <SummaryPill
              active={filter === 'telemetry'}
              label="Telemetry"
              value={String(counts.telemetry)}
              onClick={() => setFilter('telemetry')}
            />
            <SummaryPill
              active={filter === 'obd-diagnostic'}
              label="OBD"
              value={String(counts.obd)}
              onClick={() => setFilter('obd-diagnostic')}
            />
            <SummaryPill
              active={filter === 'session'}
              label="Phiên"
              value={String(counts.session)}
              onClick={() => setFilter('session')}
            />
            <SummaryPill
              active={filter === 'command'}
              label="Lệnh"
              value={String(counts.command)}
              onClick={() => setFilter('command')}
            />
            <SummaryPill
              active={filter === 'error'}
              label="Lỗi"
              value={String(counts.error)}
              onClick={() => setFilter('error')}
            />
            <SummaryPill
              active={filter === 'event-log'}
              label="Event log"
              value={`${counts.eventLog} / ${eventLogsTotal}`}
              onClick={() => setFilter('event-log')}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant={filter === item.value ? 'default' : 'outline'}
                className="h-7 px-2.5 text-[11px]"
                aria-pressed={filter === item.value}
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
                    const badges = getSourceBadges(row);
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
                          <div className="flex flex-wrap justify-end gap-1">
                            {badges.map((badge) => (
                              <Badge key={`${row.id}-${badge.label}`} variant={badge.variant}>
                                {badge.label}
                              </Badge>
                            ))}
                          </div>
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
                <div className="flex flex-wrap justify-end gap-1">
                  {getSourceBadges(selectedRow).map((badge) => (
                    <Badge key={`${selectedRow.id}-${badge.label}`} variant={badge.variant}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
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

                <div className="min-h-0">
                  {selectedFirmwarePayload ? (
                    <div className="grid h-full min-h-0 gap-3">
                      <JsonPayloadPanel
                        className="min-h-[14rem]"
                        title="Rawdata device canonical"
                        subtitle="Payload canonical do device gui len, da bo auth_token"
                        payload={selectedFirmwarePayload}
                      />
                      <JsonPayloadPanel
                        className="min-h-[14rem]"
                        title="Event log hệ thống"
                        subtitle="Bản ghi backend lưu trong event_logs"
                        payload={selectedRow.payload}
                      />
                    </div>
                  ) : (
                    <JsonPayloadPanel
                      className="h-full"
                      title="Event log hệ thống"
                      subtitle="Payload API gốc của bản ghi đang chọn"
                      payload={selectedRow.payload}
                    />
                  )}
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

