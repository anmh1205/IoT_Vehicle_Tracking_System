'use client';

export type RuntimeRange = 7 | 30 | 90;
export type VibPeriod = 'sample' | 'minute' | 'hour' | 'day';
export type DetailTab = 'overview' | 'sessions' | 'errors' | 'runtime' | 'vibration' | 'settings';

export const STATUS_LABEL: Record<string, string> = {
  running: 'Đang chạy',
  disconnected: 'Mất kết nối',
  stopped: 'Dừng'
};

export const STATUS_VARIANT: Record<string, 'default' | 'outline' | 'destructive' | 'secondary'> = {
  running: 'default',
  disconnected: 'destructive',
  stopped: 'secondary'
};

