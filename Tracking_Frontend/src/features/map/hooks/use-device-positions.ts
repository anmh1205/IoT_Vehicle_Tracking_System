import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mapServices } from '@/lib/api/map';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition } from '@/features/map/types';

const toDevicePosition = (raw: any): DevicePosition => ({
  deviceId: String(raw?.deviceId ?? raw?.device_id ?? ''),
  deviceName: String(
    raw?.deviceName ?? raw?.device_name ?? raw?.deviceId ?? raw?.device_id ?? 'Unknown',
  ),
  vehiclePlate: raw?.vehiclePlate ?? raw?.vehicle_plate ?? null,
  lat: Number(raw?.lat ?? raw?.latitude ?? 0),
  lon: Number(raw?.lon ?? raw?.longitude ?? 0),
  speed: Number(raw?.speed ?? 0),
  heading: Number(raw?.heading ?? 0),
  status: (raw?.status ?? raw?.currentStatus ?? 'disconnected') as DevicePosition['status'],
  timestamp: Number(raw?.timestamp ?? Date.now()),
  battery: raw?.battery !== undefined && raw?.battery !== null ? Number(raw.battery) : null,
  vibration: raw?.vibration !== undefined && raw?.vibration !== null ? Number(raw.vibration) : null,
  temperature:
    raw?.temperature !== undefined && raw?.temperature !== null ? Number(raw.temperature) : null,
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
