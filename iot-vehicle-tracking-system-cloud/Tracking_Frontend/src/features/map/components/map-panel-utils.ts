'use client';

import { isVehicleEngineOnState, isVehicleMovingState, isVehicleStationaryState } from '@/lib/utils/device-state';
import { hasValidMapCoordinates } from '@/features/map/constants/map-config';
import type { DevicePosition } from '@/features/map/types';

const STATUS_PRIORITY: Record<DevicePosition['status'], number> = {
  error: 0,
  disconnected: 1,
  running: 2,
  online: 3,
  stopped: 4,
};

export interface MapDeviceStats {
  total: number;
  visible: number;
  engineOn: number;
  moving: number;
  stationary: number;
  deviceFaults: number;
}

export const filterDevices = (
  devices: DevicePosition[],
  searchTerm: string,
  statusFilter: 'all' | DevicePosition['status'],
) => {
  const keyword = searchTerm.trim().toLowerCase();

  return devices.filter((device) => {
    const matchesSearch =
      keyword.length === 0 ||
      device.deviceName.toLowerCase().includes(keyword) ||
      device.deviceId.toLowerCase().includes(keyword) ||
      (device.vehiclePlate ?? '').toLowerCase().includes(keyword);
    const matchesStatus = statusFilter === 'all' || statusFilter === device.status;

    return matchesSearch && matchesStatus;
  });
};

export const sortDevices = (devices: DevicePosition[]) =>
  [...devices].sort((left, right) => {
    const statusDelta =
      (STATUS_PRIORITY[left.status] ?? Number.MAX_SAFE_INTEGER) -
      (STATUS_PRIORITY[right.status] ?? Number.MAX_SAFE_INTEGER);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    const timestampDelta = (right.timestamp ?? 0) - (left.timestamp ?? 0);
    if (timestampDelta !== 0) {
      return timestampDelta;
    }

    const speedDelta = Number(right.speed ?? 0) - Number(left.speed ?? 0);
    if (speedDelta !== 0) {
      return speedDelta;
    }

    return left.deviceName.localeCompare(right.deviceName);
  });

export const buildMapDeviceStats = (
  visibleDevices: DevicePosition[],
  totalDevices = visibleDevices.length,
): MapDeviceStats => ({
  total: totalDevices,
  visible: visibleDevices.length,
  engineOn: visibleDevices.filter(
    (device) =>
      device.ignitionState === 'ON' || isVehicleEngineOnState(device.vehicleState),
  ).length,
  moving: visibleDevices.filter(
    (device) =>
      device.motionState === 'MOVING' || isVehicleMovingState(device.vehicleState),
  ).length,
  stationary: visibleDevices.filter(
    (device) =>
      device.motionState === 'STATIONARY' || isVehicleStationaryState(device.vehicleState),
  ).length,
  deviceFaults: visibleDevices.filter(
    (device) =>
      device.deviceState === 'FAULT' ||
      device.status === 'error' ||
      device.status === 'disconnected' ||
      !hasValidMapCoordinates(device),
  ).length,
});
