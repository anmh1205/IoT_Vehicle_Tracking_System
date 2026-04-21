export const DEVICE_STATUS_LABELS: Record<string, string> = {
  running: 'Đang chạy',
  online: 'Trực tuyến',
  stopped: 'Tạm dừng',
  disconnected: 'Mất kết nối',
  completed: 'Hoàn thành',
};

export const DEVICE_STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  running: 'default',
  online: 'default',
  stopped: 'secondary',
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
