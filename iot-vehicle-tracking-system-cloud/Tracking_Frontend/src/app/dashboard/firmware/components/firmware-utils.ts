import type { FirmwareDeployment } from '@/lib/api/firmware';
import { formatNumber } from '@/lib/utils/date/format';

export type FirmwareDeviceStatusFilter =
  | 'all'
  | 'running'
  | 'online'
  | 'stopped'
  | 'disconnected';

export const FIRMWARE_STATUS_LABELS: Record<string, string> = {
  active: 'Đang kích hoạt',
  inactive: 'Đã lưu trữ',
};

export const DEPLOYMENT_STATUS_LABELS: Record<string, string> = {
  assigned: 'Đã xếp hàng',
  pending: 'Đang chờ',
  processing: 'Đang xử lý',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
  downloading: 'Đang tải',
  verifying: 'Đang xác minh',
  installing: 'Đang cài đặt',
  rebooting: 'Đang khởi động lại',
  confirming: 'Đang xác nhận',
  success: 'Thành công',
  rolled_back: 'Đã rollback',
  in_progress: 'Đang triển khai',
  stuck_timeout: 'Bị kẹt (timeout)',
};

export const DEVICE_STATUS_LABELS: Record<
  Exclude<FirmwareDeviceStatusFilter, 'all'>,
  string
> = {
  running: 'Đang gửi dữ liệu',
  online: 'Còn heartbeat',
  stopped: 'Chậm nhịp',
  disconnected: 'Mất kết nối',
};

export const DEVICE_STATUS_FILTER_OPTIONS: Array<{
  value: FirmwareDeviceStatusFilter;
  label: string;
}> = [
  { value: 'all', label: 'Tất cả kết nối' },
  { value: 'running', label: DEVICE_STATUS_LABELS.running },
  { value: 'online', label: DEVICE_STATUS_LABELS.online },
  { value: 'stopped', label: DEVICE_STATUS_LABELS.stopped },
  { value: 'disconnected', label: DEVICE_STATUS_LABELS.disconnected },
];

export const DEPLOYMENT_STRATEGY_LABELS: Record<'rolling' | 'all_at_once', string> = {
  rolling: 'Rolling',
  all_at_once: 'Đồng loạt',
};

export const getDeploymentStatusLabel = (status: string | null | undefined) =>
  DEPLOYMENT_STATUS_LABELS[status ?? ''] ?? status ?? '--';

export const getDeploymentBadgeVariant = (status: string | null | undefined) =>
  status === 'failed' || status === 'stuck_timeout'
    ? ('destructive' as const)
    : ('outline' as const);

export const getFirmwareDisplayVersion = (version: string | null | undefined) => {
  if (!version) {
    return '--';
  }

  return version.startsWith('v') ? version : `v${version}`;
};

export const formatBytes = (value: number | string | null | undefined) => {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** exponent;
  return `${formatNumber(size, { maximumFractionDigits: exponent === 0 ? 0 : 1 })} ${units[exponent]}`;
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

export const sortDeploymentsByRecentActivity = (
  left: FirmwareDeployment,
  right: FirmwareDeployment,
) => {
  const rightTime =
    Date.parse(right.completedAt ?? right.lastSeenAt ?? right.updatedAt ?? right.startedAt ?? '') || 0;
  const leftTime =
    Date.parse(left.completedAt ?? left.lastSeenAt ?? left.updatedAt ?? left.startedAt ?? '') || 0;
  return rightTime - leftTime;
};
