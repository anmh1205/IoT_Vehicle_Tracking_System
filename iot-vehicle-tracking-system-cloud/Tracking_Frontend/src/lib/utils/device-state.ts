import type {
  DeviceAlertSummary,
  DeviceRuntimeState,
  IgnitionState,
  MotionState,
  VehicleState,
} from '@/features/devices/types';

export type StateTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';
export type DeviceConnectivityStatus = 'running' | 'stopped' | 'disconnected' | 'online' | 'error';

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

export const isVehicleEngineOnState = (vehicleState: VehicleState | null | undefined): boolean =>
  vehicleState === 'IDLING_ON' || vehicleState === 'MOVING_ON';

export const isVehicleMovingState = (vehicleState: VehicleState | null | undefined): boolean =>
  vehicleState === 'MOVING_ON' ||
  vehicleState === 'ROLLING_IGN_OFF' ||
  vehicleState === 'UNKNOWN_MOVING';

export const isVehicleStationaryState = (
  vehicleState: VehicleState | null | undefined,
): boolean =>
  vehicleState === 'PARKED_OFF' ||
  vehicleState === 'IDLING_ON' ||
  vehicleState === 'UNKNOWN_STATIONARY';

export const isVehicleParkedOffState = (
  vehicleState: VehicleState | null | undefined,
): boolean => vehicleState === 'PARKED_OFF';

export const getVehicleStatePresentation = (
  vehicleState: VehicleState | null | undefined,
): StatePresentation => {
  switch (vehicleState) {
    case 'MOVING_ON':
      return { label: 'Xe', value: 'Đang chạy', tone: 'success' };
    case 'IDLING_ON':
      return { label: 'Xe', value: 'Nổ máy / đứng yên', tone: 'warn' };
    case 'PARKED_OFF':
      return { label: 'Xe', value: 'Đỗ xe / tắt máy', tone: 'neutral' };
    case 'ROLLING_IGN_OFF':
      return { label: 'Xe', value: 'Trôi xe / tắt máy', tone: 'danger' };
    case 'UNKNOWN_STATIONARY':
      return { label: 'Xe', value: 'Đứng yên / chưa rõ máy', tone: 'info' };
    case 'UNKNOWN_MOVING':
      return { label: 'Xe', value: 'Di chuyển / chưa rõ máy', tone: 'info' };
    default:
      return { label: 'Xe', value: 'Chưa rõ', tone: 'info' };
  }
};

export const getConnectivityPresentation = (
  status: DeviceConnectivityStatus | null | undefined,
): StatePresentation => {
  switch (status) {
    case 'running':
      return { label: 'Kết nối', value: 'Đang gửi dữ liệu', tone: 'success' };
    case 'online':
      return { label: 'Kết nối', value: 'Còn heartbeat', tone: 'info' };
    case 'stopped':
      return { label: 'Kết nối', value: 'Chậm nhịp', tone: 'warn' };
    case 'disconnected':
      return { label: 'Kết nối', value: 'Mất kết nối', tone: 'danger' };
    case 'error':
      return { label: 'Kết nối', value: 'Lỗi telemetry', tone: 'danger' };
    default:
      return { label: 'Kết nối', value: 'Chưa rõ', tone: 'info' };
  }
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
