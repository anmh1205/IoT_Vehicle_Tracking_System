import { generateToken, hashToken } from '@/shared/utils/crypto.util';
import { createNotFoundError, createConflictError } from '@/shared/utils/errors.util';
import * as deviceRepo from '@/domain/device/repositories/device.repository';
import { logger } from '@/infrastructure/logger';
import type {
  CreateDeviceInput,
  UpdateDeviceInput,
  DevicePublic,
} from '@/domain/device/types/device.types';
import type { Device } from '@/domain/device/types/device.types';

const toAlertSummary = (
  source: 'device' | 'ecu',
  count: number | null | undefined,
  highestSeverity: Device['device_alert_highest_severity'] | Device['ecu_alert_highest_severity'],
  titles: string[] | null | undefined,
) => ({
  source,
  count: count ?? 0,
  highestSeverity: highestSeverity ?? 'none',
  titles: titles ?? [],
});

const sanitizeDevice = (device: Device): DevicePublic => ({
  id: device.id,
  deviceId: device.device_id,
  deviceName: device.device_name,
  currentStatus: device.current_status,
  ignitionState: device.ignition_state,
  motionState: device.motion_state,
  vehicleState: device.vehicle_state,
  deviceState: device.device_state,
  sleepMode: device.sleep_mode,
  stateUpdatedAt: device.state_updated_at?.toISOString() ?? null,
  deviceAlerts: toAlertSummary(
    'device',
    device.device_alert_count,
    device.device_alert_highest_severity,
    device.device_alert_titles,
  ),
  ecuAlerts: toAlertSummary(
    'ecu',
    device.ecu_alert_count,
    device.ecu_alert_highest_severity,
    device.ecu_alert_titles,
  ),
  lastSeenAt: device.last_seen_at?.toISOString() ?? null,
  totalRuntimeSeconds: device.total_runtime_seconds,
  latitude: device.latitude,
  longitude: device.longitude,
  firmwareVersion: device.firmware_version,
  targetFirmwareVersion: device.target_firmware_version,
  lastErrorCode: device.last_error_code,
  createdAt: device.created_at.toISOString(),
});

export const createDevice = async (
  input: CreateDeviceInput,
): Promise<DevicePublic & { authToken: string }> => {
  const existing = await deviceRepo.findByDeviceId(input.deviceId);
  if (existing) {
    throw createConflictError(`Device with ID "${input.deviceId}" already exists`);
  }

  const authToken = generateToken();
  const device = await deviceRepo.create(input, authToken);
  logger.info(`Device "${input.deviceId}" created successfully`);

  return {
    ...sanitizeDevice(device),
    authToken,
  };
};

export const updateDevice = async (id: number, input: UpdateDeviceInput): Promise<DevicePublic> => {
  const existing = await deviceRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Device with ID ${id} not found`);
  }

  const updated = await deviceRepo.update(id, input);
  if (!updated) {
    throw createNotFoundError(`Device with ID ${id} not found`);
  }

  logger.info(`Device "${existing.device_id}" updated successfully`);
  return sanitizeDevice(updated);
};

export const deleteDevice = async (id: number): Promise<void> => {
  const existing = await deviceRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Device with ID ${id} not found`);
  }

  await deviceRepo.remove(id);
  logger.info(`Device "${existing.device_id}" deleted successfully`);
};

export const regenerateToken = async (id: number): Promise<{ authToken: string }> => {
  const existing = await deviceRepo.findById(id);
  if (!existing) {
    throw createNotFoundError(`Device with ID ${id} not found`);
  }

  const newToken = generateToken();
  await deviceRepo.updateAuthToken(id, hashToken(newToken));

  logger.info(`Auth token regenerated for device "${existing.device_id}"`);
  return { authToken: newToken };
};
