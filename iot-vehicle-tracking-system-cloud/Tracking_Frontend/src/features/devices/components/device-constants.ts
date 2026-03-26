export const DEVICE_STATUS_LABELS: Record<string, string> = {
  running: 'Đang chạy',
  stopped: 'Tạm dừng',
  disconnected: 'Mất kết nối',
  completed: 'Hoàn thành',
};

export const DEVICE_STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  running: 'default',
  stopped: 'secondary',
  disconnected: 'destructive',
  completed: 'outline',
};

export const DEVICE_DETAIL_TABS = [
  'overview',
  'sessions',
  'errors',
  'runtime',
  'vibration',
  'settings',
] as const;

export type DeviceDetailTab = (typeof DEVICE_DETAIL_TABS)[number];
