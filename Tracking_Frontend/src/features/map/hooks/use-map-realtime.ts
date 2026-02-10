import { useEffect } from 'react';
import { useSocket } from '@/components/providers/socket-provider';
import { useMapStore } from '@/lib/stores/map-store';

export const useMapRealtime = () => {
  const socket = useSocket();
  const updatePosition = useMapStore((s) => s.updatePosition);

  useEffect(() => {
    if (!socket) return;

    const handler = (data: any) => {
      updatePosition({
        deviceId: data.deviceId,
        deviceName: data.deviceName ?? data.deviceId,
        vehiclePlate: data.vehiclePlate ?? null,
        lat: Number(data.lat),
        lon: Number(data.lon),
        speed: Number(data.speed ?? 0),
        heading: Number(data.heading ?? 0),
        status: data.status ?? 'running',
        timestamp: data.timestamp ?? Date.now(),
      });
    };

    socket.on('device:position', handler);
    return () => {
      socket.off('device:position', handler);
    };
  }, [socket, updatePosition]);
};
