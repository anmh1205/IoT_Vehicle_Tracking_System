import { useCallback, useEffect, useRef } from 'react';
import { useRealtimeSubscription } from '@/hooks/use-realtime-subscription';
import { parseMapTimestamp } from '@/features/map/constants/map-config';
import { useMapStore } from '@/features/map/store/map-store';
import { MAP_REALTIME_THROTTLE_MS } from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';

const toDevicePosition = (raw: any): DevicePosition => ({
  deviceId: String(raw?.deviceId ?? raw?.device_id ?? ''),
  deviceName: String(
    raw?.deviceName ?? raw?.device_name ?? raw?.deviceId ?? raw?.device_id ?? 'Unknown',
  ),
  vehiclePlate: raw?.vehiclePlate ?? raw?.vehicle_plate ?? null,
  lat: Number(raw?.lat ?? raw?.latitude ?? Number.NaN),
  lon: Number(raw?.lon ?? raw?.longitude ?? Number.NaN),
  speed: Number(raw?.speed ?? 0),
  heading: Number(raw?.heading ?? 0),
  status: (raw?.status ?? raw?.currentStatus ?? 'disconnected') as DevicePosition['status'],
  timestamp: parseMapTimestamp(raw?.timestamp ?? raw?.lastSeenAt ?? raw?.last_seen_at),
  battery: raw?.battery !== undefined && raw?.battery !== null ? Number(raw.battery) : null,
  vibration: raw?.vibration !== undefined && raw?.vibration !== null ? Number(raw.vibration) : null,
  temperature:
    raw?.temperature !== undefined && raw?.temperature !== null ? Number(raw.temperature) : null,
});

const mergePosition = (
  next: DevicePosition,
  previous: DevicePosition | undefined,
): DevicePosition => ({
  ...previous,
  ...next,
  deviceId: next.deviceId || previous?.deviceId || '',
  deviceName: next.deviceName || previous?.deviceName || 'Unknown',
  vehiclePlate: next.vehiclePlate ?? previous?.vehiclePlate ?? null,
  lat: Number.isFinite(next.lat) ? next.lat : (previous?.lat ?? Number.NaN),
  lon: Number.isFinite(next.lon) ? next.lon : (previous?.lon ?? Number.NaN),
  speed: Number.isFinite(next.speed) ? next.speed : (previous?.speed ?? 0),
  heading: Number.isFinite(next.heading) ? next.heading : (previous?.heading ?? 0),
  status: next.status ?? previous?.status ?? 'disconnected',
  timestamp: next.timestamp ?? previous?.timestamp ?? null,
  battery: next.battery ?? previous?.battery ?? null,
  vibration: next.vibration ?? previous?.vibration ?? null,
  temperature: next.temperature ?? previous?.temperature ?? null,
});

export const useMapRealtime = () => {
  const updateBatch = useMapStore((state) => state.updateBatch);
  const bufferRef = useRef<Map<string, DevicePosition>>(new Map());

  const enqueuePosition = useCallback((payload: any) => {
    const position = toDevicePosition(payload);
    if (!position.deviceId) {
      return;
    }
    const buffered = bufferRef.current.get(position.deviceId);
    const existing = useMapStore.getState().positions.get(position.deviceId);
    bufferRef.current.set(position.deviceId, mergePosition(position, buffered ?? existing));
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
