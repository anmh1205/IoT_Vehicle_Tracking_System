import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { mapServices } from '@/lib/api/map';
import { useMapStore } from '@/lib/stores/map-store';

export const useDevicePositions = () => {
  const updateBatch = useMapStore((s) => s.updateBatch);
  const query = useQuery({ queryKey: ['device-positions'], queryFn: () => mapServices.getPositions(), refetchInterval: 30000 });

  useEffect(() => {
    const rows = query.data?.items ?? query.data?.data?.items ?? query.data?.data ?? query.data ?? [];
    if (!Array.isArray(rows)) return;

    updateBatch(rows.map((row: any) => ({
      deviceId: row.deviceId ?? row.device_id,
      deviceName: row.deviceName ?? row.device_name ?? row.deviceId,
      vehiclePlate: row.vehiclePlate ?? null,
      lat: Number(row.lat ?? row.latitude ?? 0),
      lon: Number(row.lon ?? row.longitude ?? 0),
      speed: Number(row.speed ?? 0),
      heading: Number(row.heading ?? 0),
      status: row.status ?? row.currentStatus ?? 'running',
      timestamp: row.timestamp ?? Date.now(),
    })));
  }, [query.data, updateBatch]);

  return query;
};
