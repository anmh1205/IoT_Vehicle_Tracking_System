import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mapServices } from '@/lib/api/map';
import { localizeAlertTitle } from '@/lib/api/alerts';
import { parseMapTimestamp } from '@/features/map/constants/map-config';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition } from '@/features/map/types';

const toNullableNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const localizeAlertTitles = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => localizeAlertTitle(String(item ?? '').trim()))
    .filter((item): item is string => Boolean(item));
};

const toDevicePosition = (raw: any): DevicePosition => ({
  deviceId: String(raw?.deviceId ?? raw?.device_id ?? ''),
  deviceName: String(
    raw?.deviceName ?? raw?.device_name ?? raw?.deviceId ?? raw?.device_id ?? 'Unknown',
  ),
  vehicleId: raw?.vehicleId ?? raw?.vehicle_id ?? null,
  vehiclePlate: raw?.vehiclePlate ?? raw?.vehicle_plate ?? null,
  customerName: raw?.customerName ?? raw?.customer_name ?? null,
  lat: Number(raw?.lat ?? raw?.latitude ?? Number.NaN),
  lon: Number(raw?.lon ?? raw?.longitude ?? Number.NaN),
  speed: Number(raw?.speed ?? 0),
  heading: Number(raw?.heading ?? 0),
  status: (raw?.status ?? raw?.currentStatus ?? 'disconnected') as DevicePosition['status'],
  timestamp: parseMapTimestamp(raw?.timestamp ?? raw?.lastSeenAt ?? raw?.last_seen_at),
  battery: toNullableNumber(raw?.battery),
  deviceBattery: toNullableNumber(raw?.deviceBattery ?? raw?.device_battery),
  vehicleBattery: toNullableNumber(raw?.vehicleBattery ?? raw?.vehicle_battery),
  vibration: toNullableNumber(raw?.vibration),
  temperature: toNullableNumber(raw?.temperature),
  engineTemperature: toNullableNumber(raw?.engineTemperature ?? raw?.engine_temperature),
  rpm: toNullableNumber(raw?.rpm),
  activeAlertCount: Number(raw?.activeAlertCount ?? raw?.active_alert_count ?? 0),
  activeAlertTitles: localizeAlertTitles(raw?.activeAlertTitles ?? raw?.active_alert_titles),
});

export const useDevicePositions = () => {
  const updateBatch = useMapStore((state) => state.updateBatch);

  const query = useQuery({
    queryKey: ['device-positions'],
    queryFn: () => mapServices.getPositions(),
    refetchInterval: 2_000,
  });

  useEffect(() => {
    const rows =
      query.data?.items ?? query.data?.data?.items ?? query.data?.data ?? query.data ?? [];
    if (!Array.isArray(rows)) {
      return;
    }
    updateBatch(rows.map(toDevicePosition));
  }, [query.data, updateBatch]);

  return query;
};
