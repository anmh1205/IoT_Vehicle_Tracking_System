import type {
  DeviceAlertSummary,
  DeviceRuntimeState,
  IgnitionState,
  MotionState,
} from '@/features/devices/types';

export type StateTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';

export interface StatePresentation {
  label: string;
  value: string;
  tone: StateTone;
}

export interface FreshnessPresentation {
  label: string;
  tone: StateTone;
}

export interface AlertSummaryPresentation {
  label: string;
  summary: string;
  tone: StateTone;
}

const parseTimestamp = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const getFreshnessPresentation = (
  value: string | number | null | undefined,
): FreshnessPresentation => {
  const timestamp = parseTimestamp(value);
  if (!timestamp) {
    return { label: 'Chưa có dữ liệu', tone: 'neutral' };
  }

  const ageSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (ageSeconds <= 90) {
    return { label: 'Vừa cập nhật', tone: 'success' };
  }
  if (ageSeconds <= 300) {
    return { label: 'Cập nhật trễ', tone: 'warn' };
  }
  if (ageSeconds <= 900) {
    return { label: 'Dữ liệu cũ', tone: 'warn' };
  }
  return { label: 'Mất kết nối', tone: 'danger' };
};

export const getEnginePresentation = (
  ignitionState: IgnitionState | null | undefined,
): StatePresentation => {
  if (ignitionState === 'ON') {
    return { label: 'Động cơ', value: 'Bật', tone: 'warn' };
  }
  if (ignitionState === 'OFF') {
    return { label: 'Động cơ', value: 'Tắt', tone: 'neutral' };
  }
  return { label: 'Động cơ', value: 'Chưa rõ', tone: 'info' };
};

export const getMotionPresentation = (
  motionState: MotionState | null | undefined,
): StatePresentation => {
  if (motionState === 'MOVING') {
    return { label: 'Di chuyển', value: 'Đang chạy', tone: 'success' };
  }
  if (motionState === 'STATIONARY') {
    return { label: 'Di chuyển', value: 'Đứng yên', tone: 'neutral' };
  }
  return { label: 'Di chuyển', value: 'Chưa rõ', tone: 'info' };
};

export const getDeviceRuntimePresentation = (
  deviceState: DeviceRuntimeState | null | undefined,
): StatePresentation => {
  switch (deviceState) {
    case 'ACTIVE':
      return { label: 'Thiết bị', value: 'Hoạt động', tone: 'success' };
    case 'SLEEP_PREPARE':
      return { label: 'Thiết bị', value: 'Chuẩn bị ngủ', tone: 'warn' };
    case 'SLEEPING':
      return { label: 'Thiết bị', value: 'Đang ngủ', tone: 'neutral' };
    case 'WAKING':
      return { label: 'Thiết bị', value: 'Đang thức dậy', tone: 'info' };
    case 'ALARM':
      return { label: 'Thiết bị', value: 'Báo động', tone: 'danger' };
    case 'OTA':
      return { label: 'Thiết bị', value: 'Cập nhật', tone: 'info' };
    case 'FAULT':
      return { label: 'Thiết bị', value: 'Lỗi', tone: 'danger' };
    case 'BOOTING':
      return { label: 'Thiết bị', value: 'Khởi động', tone: 'info' };
    default:
      return { label: 'Thiết bị', value: 'Chưa rõ', tone: 'info' };
  }
};

const severityToTone = (severity: DeviceAlertSummary['highestSeverity']): StateTone => {
  if (severity === 'critical' || severity === 'high') return 'danger';
  if (severity === 'medium') return 'warn';
  if (severity === 'low') return 'info';
  return 'neutral';
};

export const getAlertSummaryPresentation = (
  summary: DeviceAlertSummary | null | undefined,
  label: string,
): AlertSummaryPresentation => {
  if (!summary || summary.count <= 0) {
    return {
      label,
      summary: 'Không có',
      tone: 'neutral',
    };
  }

  const firstTitle = summary.titles.find((item) => item.trim().length > 0);
  return {
    label,
    summary: firstTitle ? `${summary.count} cảnh báo · ${firstTitle}` : `${summary.count} cảnh báo`,
    tone: severityToTone(summary.highestSeverity),
  };
};
