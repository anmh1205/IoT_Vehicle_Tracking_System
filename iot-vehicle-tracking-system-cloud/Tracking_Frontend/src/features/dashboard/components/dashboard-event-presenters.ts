import type { DashboardEvent } from '@/features/dashboard/hooks/use-dashboard-stats';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export interface DashboardEventPresentation {
  title: string;
  description: string;
  sourceLabel: string;
  categoryLabel: string;
  severityLabel: string;
  severityVariant: BadgeVariant;
}

const SEVERITY_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  critical: { label: 'Nghiêm trọng', variant: 'destructive' },
  high: { label: 'Cao', variant: 'destructive' },
  medium: { label: 'Trung bình', variant: 'secondary' },
  warning: { label: 'Cảnh báo', variant: 'secondary' },
  error: { label: 'Lỗi', variant: 'destructive' },
  low: { label: 'Thấp', variant: 'outline' },
  info: { label: 'Thông tin', variant: 'outline' },
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  status_change: 'Trạng thái',
  connection: 'Kết nối',
  warning: 'Cảnh báo',
  error: 'Sự cố',
  alert: 'Cảnh báo',
};

const CODE_TITLE_MAP: Record<string, string> = {
  mqtt_bridge_rawdata: 'Đã nhận bản tin telemetry mới',
  obd_live_data: 'Đã cập nhật dữ liệu OBD trực tiếp',
  dtc_pending: 'Phát hiện mã lỗi OBD chờ xử lý',
  idle_too_long: 'Xe dừng chờ quá lâu',
  device_offline: 'Thiết bị mất kết nối',
  normal_run: 'Thiết bị vận hành ổn định',
  session_end: 'Kết thúc phiên chạy',
};

const FALLBACK_DESCRIPTION: Record<string, string> = {
  mqtt_bridge_rawdata: 'MQTT Bridge vừa xác nhận đã nhận bản tin dữ liệu thô mới từ thiết bị.',
  obd_live_data: 'Thiết bị vừa gửi thêm mẫu PID hoặc telemetry OBD mới lên cloud.',
  dtc_pending: 'Thiết bị vừa phát hiện mã lỗi OBD cần tiếp tục theo dõi hoặc xác nhận.',
  idle_too_long: 'Thiết bị đứng yên lâu hơn ngưỡng vận hành đã theo dõi.',
  device_offline: 'Thiết bị đã im lặng vượt ngưỡng và cần kiểm tra lại kết nối.',
  normal_run: 'Thiết bị vẫn đang gửi bản tin đều trong phiên vận hành hiện tại.',
  session_end: 'Cloud đã khép phiên vận hành gần nhất của thiết bị.',
};

const trimSentence = (value: string) => value.replace(/\s+/g, ' ').trim();

const localizeMessage = (message: string, eventCode: string) => {
  const normalized = trimSentence(message);
  if (!normalized) {
    return FALLBACK_DESCRIPTION[eventCode] ?? 'Cloud đã ghi nhận thêm một sự kiện vận hành mới.';
  }

  if (/Recent MQTT Bridge rawdata heartbeat/i.test(normalized)) {
    return 'MQTT Bridge vừa nhận heartbeat dữ liệu thô mới trong môi trường kiểm tra cục bộ.';
  }
  if (/Latest OBD telemetry sample matched/i.test(normalized)) {
    return 'Mẫu telemetry OBD mới nhất đã khớp với ảnh chụp trạng thái thiết bị hiện tại.';
  }
  if (/Live OBD telemetry updated near inner-city segment/i.test(normalized)) {
    return 'Dữ liệu OBD trực tiếp vừa được cập nhật trên đoạn đường nội đô.';
  }
  if (/Live OBD telemetry synced during corridor segment/i.test(normalized)) {
    return 'Dữ liệu OBD trực tiếp vừa được đồng bộ trên đoạn hành lang đang theo dõi.';
  }

  const pendingDtc = normalized.match(/Pending OBD fault ([A-Z0-9]+)/i);
  if (pendingDtc) {
    return `Thiết bị vừa phát hiện lỗi OBD ${pendingDtc[1]} trong lượt chạy gần nhất.`;
  }

  const offlineMinutes = normalized.match(/Device offline for (\d+) minutes/i);
  if (offlineMinutes) {
    return `Thiết bị đã mất tín hiệu liên tục ${offlineMinutes[1]} phút.`;
  }

  if (/Idle too long at pickup point/i.test(normalized)) {
    return 'Thiết bị đứng yên quá lâu tại điểm đón khách.';
  }
  if (/Vehicle running stable on district route/i.test(normalized)) {
    return 'Thiết bị đang gửi dữ liệu ổn định trên tuyến quận hiện tại.';
  }
  if (/Session ended after depot handover/i.test(normalized)) {
    return 'Phiên chạy đã kết thúc sau khi xe bàn giao tại depot.';
  }
  if (/New .* alert:/i.test(normalized)) {
    return normalized.replace(/^New\s+/i, 'Phát sinh ');
  }

  return normalized;
};

export const getDashboardSeverityMeta = (severity?: string | null) =>
  SEVERITY_LABELS[String(severity ?? '').toLowerCase()] ?? SEVERITY_LABELS.info;

export const getDashboardEventPresentation = (
  event: DashboardEvent,
): DashboardEventPresentation => {
  const eventCode = String(event.eventCode ?? '').toLowerCase();
  const eventType = String(event.eventType ?? '').toLowerCase();
  const severity = getDashboardSeverityMeta(event.severity);

  return {
    title: CODE_TITLE_MAP[eventCode] ?? EVENT_TYPE_LABELS[eventType] ?? 'Cập nhật vận hành',
    description: localizeMessage(String(event.message ?? ''), eventCode),
    sourceLabel: event.deviceId ? `Thiết bị ${event.deviceId}` : 'Sự kiện hệ thống',
    categoryLabel: EVENT_TYPE_LABELS[eventType] ?? 'Vận hành',
    severityLabel: severity.label,
    severityVariant: severity.variant,
  };
};
