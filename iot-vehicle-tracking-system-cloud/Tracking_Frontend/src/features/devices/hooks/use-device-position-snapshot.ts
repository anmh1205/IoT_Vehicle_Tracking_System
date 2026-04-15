import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import type { DevicePositionSnapshot } from '@/features/devices/types';

const toNumberOrNull = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizePosition = (row: any): DevicePositionSnapshot => ({
  deviceId: String(row?.deviceId ?? row?.device_id ?? ''),
  deviceName: String(row?.deviceName ?? row?.device_name ?? row?.deviceId ?? row?.device_id ?? ''),
  latitude: toNumberOrNull(row?.latitude ?? row?.lat),
  longitude: toNumberOrNull(row?.longitude ?? row?.lon),
  speed: toNumberOrNull(row?.speed),
  heading: toNumberOrNull(row?.heading),
  status: String(row?.currentStatus ?? row?.status ?? 'disconnected'),
  timestamp: row?.lastSeenAt ?? row?.last_seen_at ?? row?.timestamp ?? null,
  battery: toNumberOrNull(row?.battery),
  vibration: toNumberOrNull(row?.vibration),
  temperature: toNumberOrNull(row?.temperature),
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
