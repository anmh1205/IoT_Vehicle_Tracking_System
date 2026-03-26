import { useCallback, useEffect, useRef } from 'react';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { useMapStore } from '@/features/map/store/map-store';
import { MAP_REALTIME_THROTTLE_MS } from '@/features/map/constants/map-config';
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

export const useMapRealtime = () => {
  const updateBatch = useMapStore((state) => state.updateBatch);
  const bufferRef = useRef<Map<string, DevicePosition>>(new Map());

  const enqueuePosition = useCallback((payload: any) => {
    const position = toDevicePosition(payload);
    if (!position.deviceId) {
      return;
    }
    bufferRef.current.set(position.deviceId, position);
  }, []);

  useRealtimeSubscription({
    event: 'device:position',
    handler: enqueuePosition,
  });

  useRealtimeSubscription({
    event: 'device:status',
    handler: enqueuePosition,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const buffered = Array.from(bufferRef.current.values());
      if (buffered.length === 0) {
        return;
      }
      updateBatch(buffered);
      bufferRef.current.clear();
    }, MAP_REALTIME_THROTTLE_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [updateBatch]);
};
