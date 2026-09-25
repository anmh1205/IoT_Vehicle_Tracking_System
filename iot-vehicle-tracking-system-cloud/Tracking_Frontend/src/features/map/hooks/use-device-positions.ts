import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeContext, useSocket } from '@/components/providers/socket-provider';
import { deviceServices } from '@/lib/api/devices';
import { mapServices } from '@/lib/api/map';
import { localizeAlertTitle } from '@/lib/api/alerts';
import { parseMapTimestamp } from '@/features/map/constants/map-config';
import { useMapStore } from '@/features/map/store/map-store';
import type { DevicePosition } from '@/features/map/types';

const DEVICE_ROOM_LIST_LIMIT = 100;
const DEVICE_ROOM_LIST_MAX_PAGES = 50;

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

const toAlertSummary = (raw: any, source: 'device' | 'ecu'): DevicePosition['deviceAlerts'] => ({
  source,
  count: Number(raw?.count ?? 0),
  highestSeverity: (raw?.highestSeverity ?? raw?.highest_severity ?? 'none') as DevicePosition['deviceAlerts']['highestSeverity'],
  titles: localizeAlertTitles(raw?.titles),
});

const toDevicePosition = (raw: any): DevicePosition => ({
  deviceId: String(raw?.deviceId ?? ''),
  deviceName: String(raw?.deviceName ?? raw?.deviceId ?? 'Unknown'),
  vehicleId: raw?.vehicleId ?? null,
  vehiclePlate: raw?.vehiclePlate ?? null,
  customerName: raw?.customerName ?? null,
  lat: Number(raw?.latitude ?? Number.NaN),
  lon: Number(raw?.longitude ?? Number.NaN),
  speed: Number(raw?.speed ?? Number.NaN),
  heading: Number(raw?.course ?? Number.NaN),
  status: (raw?.status ?? raw?.currentStatus ?? 'disconnected') as DevicePosition['status'],
  ignitionState: (raw?.ignitionState ?? null) as DevicePosition['ignitionState'],
  motionState: (raw?.motionState ?? null) as DevicePosition['motionState'],
  vehicleState: (raw?.vehicleState ?? null) as DevicePosition['vehicleState'],
  deviceState: (raw?.deviceState ?? null) as DevicePosition['deviceState'],
  sleepMode: (raw?.sleepMode ?? null) as DevicePosition['sleepMode'],
  stateUpdatedAt: raw?.stateUpdatedAt ?? null,
  timestamp: parseMapTimestamp(raw?.timestamp ?? raw?.lastSeenAt),
  battery: toNullableNumber(raw?.vehicleBattery),
  deviceBattery: toNullableNumber(raw?.deviceBattery),
  vehicleBattery: toNullableNumber(raw?.vehicleBattery),
  satellites: toNullableNumber(raw?.satellites),
  imuAccelDeltaMps2: toNullableNumber(raw?.imuAccelDeltaMps2 ?? raw?.imu_accel_delta_mps2 ?? raw?.vibration),
  errorCode: toNullableNumber(raw?.errorCode),
  temperature: toNullableNumber(raw?.temperature),
  engineTemperature: toNullableNumber(raw?.engineTemperature),
  rpm: toNullableNumber(raw?.rpm),
  activeAlertCount: Number(raw?.activeAlertCount ?? 0),
  activeAlertTitles: localizeAlertTitles(raw?.activeAlertTitles),
  deviceAlerts: toAlertSummary(raw?.deviceAlerts ?? {}, 'device'),
  ecuAlerts: toAlertSummary(raw?.ecuAlerts ?? {}, 'ecu'),
});

const loadDeviceRoomIds = async (): Promise<string[]> => {
  const ids: string[] = [];

  for (let page = 1; page <= DEVICE_ROOM_LIST_MAX_PAGES; page += 1) {
    const payload = await deviceServices.getList({
      page,
      limit: DEVICE_ROOM_LIST_LIMIT,
      sortBy: 'lastSeenAt',
      sortOrder: 'desc',
    });
    const rows = payload.items ?? [];

    for (const row of rows) {
      const deviceId = String(row?.deviceId ?? '').trim();
      if (deviceId) {
        ids.push(deviceId);
      }
    }

    const totalPages = Number(payload.pagination?.totalPages ?? 1);
    if (rows.length === 0 || page >= totalPages) {
      break;
    }
  }

  return Array.from(new Set(ids));
};

export const useDevicePositions = () => {
  const updateBatch = useMapStore((state) => state.updateBatch);
  const deviceSocket = useSocket('devices');
  const { joinDeviceRoom, leaveDeviceRoom } = useRealtimeContext();

  const query = useQuery({
    queryKey: ['device-positions'],
    queryFn: () => mapServices.getPositions(),
  });
  const deviceRoomIdsQuery = useQuery({
    queryKey: ['map-device-room-ids'],
    queryFn: loadDeviceRoomIds,
  });

  useEffect(() => {
    const rows =
      query.data?.items ?? query.data?.data?.items ?? query.data?.data ?? query.data ?? [];
    if (!Array.isArray(rows)) {
      return;
    }

    const positions = rows.map(toDevicePosition);
    updateBatch(positions);
  }, [query.data, updateBatch]);

  useEffect(() => {
    const rows =
      query.data?.items ?? query.data?.data?.items ?? query.data?.data ?? query.data ?? [];
    const fallbackIds = Array.isArray(rows)
      ? rows
          .map((row: any) => String(row?.deviceId ?? '').trim())
          .filter((deviceId: string) => deviceId.length > 0)
      : [];
    const deviceIds =
      deviceRoomIdsQuery.data && deviceRoomIdsQuery.data.length > 0
        ? deviceRoomIdsQuery.data
        : Array.from(new Set(fallbackIds));

    deviceIds.forEach(joinDeviceRoom);
    return () => {
      deviceIds.forEach(leaveDeviceRoom);
    };
  }, [deviceRoomIdsQuery.data, query.data, joinDeviceRoom, leaveDeviceRoom]);

  useEffect(() => {
    if (!deviceSocket) {
      return;
    }

    const refetchPositions = () => {
      void query.refetch();
    };
    deviceSocket.on('connect', refetchPositions);

    return () => {
      deviceSocket.off('connect', refetchPositions);
    };
  }, [deviceSocket, query]);

  return query;
};
