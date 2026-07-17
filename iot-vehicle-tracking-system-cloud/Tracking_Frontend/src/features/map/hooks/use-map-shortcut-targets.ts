'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { vehicleServices } from '@/lib/api/vehicles';
import { buildAlertQueueHref } from '@/features/alerts/lib/alert-queue-route';
import type { DevicePosition } from '@/features/map/types';

const SHORTCUT_LOOKUP_LIMIT = 10;

const normalizeIdentifier = (value: string | null | undefined) => String(value ?? '').trim().toLowerCase();

export const useMapShortcutTargets = (device: DevicePosition | null) => {
  const deviceIdentifier = device?.deviceId?.trim() ?? '';
  const vehicleIdentifier = device?.vehicleId?.trim() ?? '';

  const deviceTargetQuery = useQuery({
    queryKey: ['map-shortcut-device-target', deviceIdentifier],
    enabled: deviceIdentifier.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const payload = await deviceServices.getList({
        search: deviceIdentifier,
        limit: SHORTCUT_LOOKUP_LIMIT,
      });

      const target = payload.items.find(
        (item: any) => normalizeIdentifier(item?.deviceId) === normalizeIdentifier(deviceIdentifier),
      );

      return target && Number.isFinite(Number(target.id)) ? Number(target.id) : null;
    },
  });

  const vehicleTargetQuery = useQuery({
    queryKey: ['map-shortcut-vehicle-target', vehicleIdentifier],
    enabled: vehicleIdentifier.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const payload = await vehicleServices.getList({
        search: vehicleIdentifier,
        limit: SHORTCUT_LOOKUP_LIMIT,
      });

      const target = (payload.items ?? []).find(
        (item: any) => normalizeIdentifier(item?.vehicleId) === normalizeIdentifier(vehicleIdentifier),
      );

      return target && Number.isFinite(Number(target.id)) ? Number(target.id) : null;
    },
  });

  const alertsHref = useMemo(() => {
    if (!deviceIdentifier) {
      return null;
    }

    return buildAlertQueueHref({
      deviceId: deviceIdentifier,
      vehicleId: vehicleIdentifier,
      status: 'active',
    });
  }, [deviceIdentifier, vehicleIdentifier]);

  return {
    alertsPath: alertsHref,
    deviceIdentifier,
    deviceRecordId: deviceTargetQuery.data ?? null,
    vehicleIdentifier,
    vehicleRecordId: vehicleTargetQuery.data ?? null,
    deviceDetailLoading: deviceTargetQuery.isPending || deviceTargetQuery.isFetching,
    vehicleDetailLoading:
      vehicleIdentifier.length > 0 && (vehicleTargetQuery.isPending || vehicleTargetQuery.isFetching),
  };
};
