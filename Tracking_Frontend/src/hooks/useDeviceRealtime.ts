'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import type { DevicePosition } from '@/types/device.types';

interface DeviceRealtimeData {
  positions: Map<string, DevicePosition>;
  statusUpdates: Map<string, string>;
}

/**
 * Placeholder hook for real-time device updates via Socket.IO.
 * Returns null values until Socket.IO namespaces are configured on the backend.
 * Once backend emits 'device:status' and 'device:position' events,
 * this hook will provide live data.
 */
export function useDeviceRealtime(): DeviceRealtimeData | null {
  const [data, setData] = useState<DeviceRealtimeData | null>(null);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const positions = new Map<string, DevicePosition>();
    const statusUpdates = new Map<string, string>();

    const handlePosition = (payload: DevicePosition) => {
      positions.set(payload.deviceId, payload);
      setData({ positions: new Map(positions), statusUpdates: new Map(statusUpdates) });
    };

    const handleStatus = (payload: { deviceId: string; status: string }) => {
      statusUpdates.set(payload.deviceId, payload.status);
      setData({ positions: new Map(positions), statusUpdates: new Map(statusUpdates) });
    };

    socket.on('device:position', handlePosition);
    socket.on('device:status', handleStatus);

    return () => {
      socket.off('device:position', handlePosition);
      socket.off('device:status', handleStatus);
    };
  }, []);

  return data;
}
