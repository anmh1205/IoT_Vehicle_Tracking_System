import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import type { DevicePositionSnapshot } from '@/features/devices/types';

const toNumberOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toAlertSummary = (raw: any, source: 'device' | 'ecu'): DevicePositionSnapshot['deviceAlerts'] => ({
  source,
  count: Number(raw?.count ?? 0),
  highestSeverity: (raw?.highestSeverity ?? raw?.highest_severity ?? 'none') as DevicePositionSnapshot['deviceAlerts']['highestSeverity'],
  titles: Array.isArray(raw?.titles)
    ? raw.titles
        .map((item: unknown) => String(item ?? '').trim())
        .filter((item: string) => item.length > 0)
    : [],
});

const normalizePosition = (row: any): DevicePositionSnapshot => ({
  deviceId: String(row?.deviceId ?? row?.device_id ?? ''),
  deviceName: String(row?.deviceName ?? row?.device_name ?? row?.deviceId ?? row?.device_id ?? ''),
  vehiclePlate: row?.vehiclePlate ?? row?.vehicle_plate ?? null,
  customerName: row?.customerName ?? row?.customer_name ?? null,
  latitude: toNumberOrNull(row?.latitude ?? row?.lat),
  longitude: toNumberOrNull(row?.longitude ?? row?.lon),
  speed: toNumberOrNull(row?.speed),
  heading: toNumberOrNull(row?.heading),
  status: String(row?.currentStatus ?? row?.status ?? 'disconnected'),
  ignitionState: (row?.ignitionState ?? row?.ignition_state ?? null) as DevicePositionSnapshot['ignitionState'],
  motionState: (row?.motionState ?? row?.motion_state ?? null) as DevicePositionSnapshot['motionState'],
  vehicleState: (row?.vehicleState ?? row?.vehicle_state ?? null) as DevicePositionSnapshot['vehicleState'],
  deviceState: (row?.deviceState ?? row?.device_state ?? null) as DevicePositionSnapshot['deviceState'],
  sleepMode: (row?.sleepMode ?? row?.sleep_mode ?? null) as DevicePositionSnapshot['sleepMode'],
  stateUpdatedAt: row?.stateUpdatedAt ?? row?.state_updated_at ?? null,
  timestamp: row?.lastSeenAt ?? row?.last_seen_at ?? row?.timestamp ?? null,
  battery: toNumberOrNull(row?.battery),
  deviceBattery: toNumberOrNull(row?.deviceBattery ?? row?.device_battery),
  vehicleBattery: toNumberOrNull(row?.vehicleBattery ?? row?.vehicle_battery),
  vibration: toNumberOrNull(row?.vibration),
  temperature: toNumberOrNull(row?.temperature),
  engineTemperature: toNumberOrNull(row?.engineTemperature ?? row?.engine_temperature),
  rpm: toNumberOrNull(row?.rpm),
  activeAlertCount: Math.max(0, Number(row?.activeAlertCount ?? row?.active_alert_count ?? 0) || 0),
  activeAlertTitles: Array.isArray(row?.activeAlertTitles ?? row?.active_alert_titles)
    ? (row?.activeAlertTitles ?? row?.active_alert_titles).filter(
        (item: unknown): item is string => typeof item === 'string' && item.trim().length > 0,
      )
    : [],
  deviceAlerts: toAlertSummary(row?.deviceAlerts ?? row?.device_alerts ?? {}, 'device'),
  ecuAlerts: toAlertSummary(row?.ecuAlerts ?? row?.ecu_alerts ?? {}, 'ecu'),
});

export const useDevicePositionSnapshot = (devicePublicId: string | null, enabled = true) => {
  const query = useQuery({
    queryKey: ['device-position-snapshot', devicePublicId],
    queryFn: () => deviceServices.getPositions(),
    refetchInterval: enabled ? 15000 : false,
    enabled: enabled && !!devicePublicId,
  });

  const position = useMemo(() => {
    const items = Array.isArray(query.data?.items)
      ? query.data.items
      : Array.isArray(query.data?.data?.items)
        ? query.data.data.items
        : Array.isArray(query.data?.data)
          ? query.data.data
          : Array.isArray(query.data)
            ? query.data
            : [];

    const matched = items.find(
      (item: any) =>
        String(item?.deviceId ?? item?.device_id ?? '') === String(devicePublicId ?? ''),
    );

    return matched ? normalizePosition(matched) : null;
  }, [devicePublicId, query.data]);

  return {
    ...query,
    position,
  };
};
