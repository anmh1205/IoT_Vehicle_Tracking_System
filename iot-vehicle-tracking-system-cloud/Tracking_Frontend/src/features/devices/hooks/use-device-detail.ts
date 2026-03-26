import { useQuery } from '@tanstack/react-query';
import { deviceDetailServices } from '@/lib/api/device-detail';
import type { Device } from '@/features/devices/types';

export interface DeviceDetailData {
  device: Device | null;
  runtime: {
    totalRuntime: number;
    totalSessions: number;
    avgSessionDuration: number;
    avgVibration: number;
    totalDataPoints: number;
  } | null;
  sessions: unknown[];
  commands: unknown[];
  errors: unknown[];
}

const toDevice = (raw: any): Device => ({
  id: Number(raw?.id ?? 0),
  deviceId: String(raw?.deviceId ?? raw?.device_id ?? ''),
  deviceName: String(raw?.deviceName ?? raw?.device_name ?? ''),
  currentStatus: (raw?.currentStatus ??
    raw?.current_status ??
    'disconnected') as Device['currentStatus'],
  imei: raw?.imei ?? null,
  firmwareVersion: raw?.firmwareVersion ?? raw?.firmware_version ?? null,
  vehiclePlate: raw?.vehiclePlate ?? raw?.vehicle_plate ?? null,
  customerName: raw?.customerName ?? raw?.customer_name ?? null,
  lastSeenAt: raw?.lastSeenAt ?? raw?.last_seen_at ?? null,
  latitude: raw?.latitude !== undefined ? Number(raw.latitude) : null,
  longitude: raw?.longitude !== undefined ? Number(raw.longitude) : null,
  totalRuntimeSeconds: Number(raw?.totalRuntimeSeconds ?? raw?.total_runtime_seconds ?? 0),
  requestInterval: Number(raw?.requestInterval ?? raw?.request_interval ?? 60),
  vibrationThreshold: Number(raw?.vibrationThreshold ?? raw?.vibration_threshold ?? 0),
  config: raw?.config ?? null,
});

export const useDeviceDetail = (id: number | null) =>
  useQuery({
    queryKey: ['device-detail', id],
    queryFn: () =>
      deviceDetailServices.getAggregate(id as number).then(
        (payload): DeviceDetailData => ({
          device: payload.device ? toDevice(payload.device) : null,
          runtime: payload.runtime,
          sessions: payload.sessions ?? [],
          commands: payload.commands ?? [],
          errors: payload.errors ?? [],
        }),
      ),
    enabled: id !== null,
  });
