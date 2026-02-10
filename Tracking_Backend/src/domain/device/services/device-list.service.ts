import * as deviceRepo from '@/domain/device/repositories/device.repository';
import type { Device, DeviceListQuery, DevicePublic, DevicePosition } from '@/domain/device/types/device.types';

const sanitizeDevice = (device: Device): DevicePublic => ({
  id: device.id,
  deviceId: device.device_id,
  deviceName: device.device_name,
  currentStatus: device.current_status,
  lastSeenAt: device.last_seen_at?.toISOString() ?? null,
  totalRuntimeSeconds: device.total_runtime_seconds,
  latitude: device.latitude,
  longitude: device.longitude,
  firmwareVersion: device.firmware_version,
  lastErrorCode: device.last_error_code,
  createdAt: device.created_at.toISOString(),
});

export const listDevices = async (
  query: DeviceListQuery,
): Promise<{ devices: DevicePublic[]; total: number; page: number; limit: number }> => {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const result = await deviceRepo.findAll(query);

  return {
    devices: result.devices.map(sanitizeDevice),
    total: result.total,
    page,
    limit,
  };
};

export const getDevicePositions = async (): Promise<DevicePosition[]> =>
  deviceRepo.findAllPositions();
