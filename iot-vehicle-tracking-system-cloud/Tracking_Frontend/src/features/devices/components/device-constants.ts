export const DEVICE_STATUS_LABELS: Record<string, string> = {
  running: 'Đang gửi dữ liệu',
  online: 'Còn heartbeat',
  stopped: 'Chậm nhịp',
  disconnected: 'Mất kết nối',
};

export const DEVICE_STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  running: 'default',
  online: 'secondary',
  stopped: 'outline',
  disconnected: 'destructive',
};

export const SESSION_STATUS_LABELS: Record<string, string> = {
  running: 'Đang hoạt động',
  completed: 'Hoàn thành',
  disconnected: 'Gián đoạn',
  stopped: 'Đã dừng',
};

export const DEVICE_DETAIL_TABS = [
  'overview',
  'route',
  'errors',
  'commands',
  'raw',
  'settings',
] as const;

export type DeviceDetailTab = (typeof DEVICE_DETAIL_TABS)[number];
