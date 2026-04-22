import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import type { DeviceFilters } from '@/lib/api/devices';
import type { Device } from '@/features/devices/types';

interface DeviceListResult {
  items: Device[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const toAlertSummary = (raw: any, source: 'device' | 'ecu'): Device['deviceAlerts'] => ({
  source,
  count: Number(raw?.count ?? 0),
  highestSeverity: (raw?.highestSeverity ?? raw?.highest_severity ?? 'none') as Device['deviceAlerts']['highestSeverity'],
  titles: Array.isArray(raw?.titles) ? raw.titles.map((item: unknown) => String(item ?? '')) : [],
});

const toDevice = (raw: any): Device => ({
  id: Number(raw?.id ?? 0),
  deviceId: String(raw?.deviceId ?? raw?.device_id ?? ''),
  deviceName: String(raw?.deviceName ?? raw?.device_name ?? ''),
  currentStatus: (raw?.currentStatus ??
    raw?.current_status ??
    'disconnected') as Device['currentStatus'],
  ignitionState: (raw?.ignitionState ?? raw?.ignition_state ?? null) as Device['ignitionState'],
  motionState: (raw?.motionState ?? raw?.motion_state ?? null) as Device['motionState'],
  vehicleState: (raw?.vehicleState ?? raw?.vehicle_state ?? null) as Device['vehicleState'],
  deviceState: (raw?.deviceState ?? raw?.device_state ?? null) as Device['deviceState'],
  sleepMode: (raw?.sleepMode ?? raw?.sleep_mode ?? null) as Device['sleepMode'],
  stateUpdatedAt: raw?.stateUpdatedAt ?? raw?.state_updated_at ?? null,
  deviceAlerts: toAlertSummary(raw?.deviceAlerts ?? raw?.device_alerts ?? {}, 'device'),
  ecuAlerts: toAlertSummary(raw?.ecuAlerts ?? raw?.ecu_alerts ?? {}, 'ecu'),
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

const toDeviceListResult = (payload: any): DeviceListResult => {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.devices)
      ? payload.devices
      : Array.isArray(payload?.data?.items)
        ? payload.data.items
      : Array.isArray(payload?.data?.devices)
        ? payload.data.devices
        : Array.isArray(payload)
          ? payload
          : [];

  const total = Number(payload?.total ?? payload?.data?.total ?? items.length);
  const page = Number(payload?.page ?? payload?.data?.page ?? 1);
  const limit = Number(payload?.limit ?? payload?.data?.limit ?? (items.length || 20));
  const pagination =
    payload?.pagination ??
    payload?.data?.pagination ?? {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / Math.max(limit, 1)), 1),
    };

  return {
    items: items.map(toDevice),
    pagination: {
      page: Number(pagination.page ?? 1),
      limit: Number(pagination.limit ?? items.length ?? 20),
      total: Number(pagination.total ?? items.length),
      totalPages: Number(pagination.totalPages ?? pagination.total_pages ?? 1),
    },
  };
};

export const useDevices = (filters?: DeviceFilters) =>
  useQuery({
    queryKey: ['devices', filters],
    queryFn: () => deviceServices.getList(filters).then(toDeviceListResult),
  });
