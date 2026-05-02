export const DEVICE_STATUS_LABELS: Record<string, string> = {
  running: 'Đang chạy',
  online: 'Đỗ xe / còn online',
  stopped: 'Đã dừng',
  disconnected: 'Mất kết nối',
  completed: 'Hoàn thành',
};

export const DEVICE_STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  running: 'default',
  online: 'secondary',
  stopped: 'outline',
  disconnected: 'destructive',
  completed: 'outline',
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
