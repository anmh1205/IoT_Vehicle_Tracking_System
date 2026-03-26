import type { Device } from '@/features/devices/types';
import { deriveDeviceStatus } from '@/hooks/use-device-status-realtime';

export const getDeviceRuntimeHours = (device: Device): number =>
  Number(((device.totalRuntimeSeconds ?? 0) / 3600).toFixed(1));

export const getDeviceStatus = (device: Device): Device['currentStatus'] =>
  deriveDeviceStatus({
    lastSeenAt: device.lastSeenAt,
    requestInterval: device.requestInterval ?? 60,
    serverStatus: device.currentStatus,
  }).status;

export const getDeviceBadgeClassName = (status: string): string => {
  if (status === 'running') return 'bg-emerald-500';
  if (status === 'stopped') return 'bg-amber-500';
  if (status === 'disconnected') return 'bg-rose-500';
  return 'bg-slate-500';
};
