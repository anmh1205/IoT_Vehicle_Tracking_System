import { rawDataSchema } from '../validators/payload.validator';
import { validateDevice } from '../infrastructure/database';
import { writeDeviceTelemetry } from '../infrastructure/victoriametrics';
import { writeDeviceEvent } from '../infrastructure/victorialogs';
import { publishInternalEvent } from '../publishers/internal-event.publisher';
import { getStatus, setStatus, getOrCreateSession } from '../cache/device-state.cache';
import { addUpdate } from '../services/batch-writer.service';
import { logger } from '../infrastructure/logger';

const VIBRATION_ALERT_THRESHOLD = 500;

/**
 * Handle raw telemetry data from devices on topic v1/{deviceId}/rawdata.
 *
 * Processing flow:
 * 1. Validate payload with Zod
 * 2. Validate device auth (check auth_token against DB)
 * 3. Get or create session
 * 4. Write to VictoriaMetrics (time-series)
 * 5. Write to VictoriaLogs (event log)
 * 6. Add to batch writer (PostgreSQL)
 * 7. Check status change -> publish internal event
 * 8. Check alerts (vibration threshold) -> publish internal event
 */
export const handleRawData = async (
  deviceIdFromTopic: string,
  message: Buffer,
): Promise<void> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(message.toString());
  } catch {
    logger.warn(`Invalid JSON from device ${deviceIdFromTopic}`);
    return;
  }

  // 1. Validate payload
  const result = rawDataSchema.safeParse(parsed);
  if (!result.success) {
    logger.warn(
      { deviceId: deviceIdFromTopic, issues: result.error.issues },
      'Invalid rawdata payload',
    );
    return;
  }

  const payload = result.data;

  // Verify topic deviceId matches payload deviceId
  if (payload.device_id !== deviceIdFromTopic) {
    logger.warn(
      `Device ID mismatch: topic=${deviceIdFromTopic}, payload=${payload.device_id}`,
    );
    return;
  }

  // 2. Validate device auth
  const device = await validateDevice(payload.device_id, payload.auth_token);
  if (!device) {
    logger.warn(`Auth failed for device ${payload.device_id}`);
    return;
  }

  // 3. Get or create session
  const [sessionId, isNewSession] = getOrCreateSession(payload.device_id);
  if (isNewSession) {
    publishInternalEvent('session', {
      device_id: payload.device_id,
      session_id: sessionId,
      action: 'started',
    });
  }

  const timestampMs = payload.timestamp;

  // 4. Write to VictoriaMetrics
  const metricsData: Record<string, number | undefined> = {
    vibration: payload.data.vibration,
    battery_top: payload.data.battery_top,
    battery_bot: payload.data.battery_bot,
    latitude: payload.data.latitude,
    longitude: payload.data.longitude,
    speed: payload.data.speed,
    course: payload.data.course,
    satellites: payload.data.satellites,
    ignition: payload.data.ignition !== undefined
      ? (payload.data.ignition ? 1 : 0)
      : undefined,
    error_code: payload.data.error_code,
  };

  if (payload.uptime !== undefined) {
    metricsData.uptime = payload.uptime;
  }

  writeDeviceTelemetry(payload.device_id, metricsData, timestampMs).catch((err) => {
    logger.error(`VictoriaMetrics write failed for ${payload.device_id}`, err);
  });

  // 5. Write to VictoriaLogs
  writeDeviceEvent(payload.device_id, 'rawdata', 'Device telemetry received', {
    session_id: sessionId,
    latitude: payload.data.latitude,
    longitude: payload.data.longitude,
    speed: payload.data.speed,
  }).catch((err) => {
    logger.error(`VictoriaLogs write failed for ${payload.device_id}`, err);
  });

  // 6. Add to batch writer (PostgreSQL)
  addUpdate({
    deviceId: payload.device_id,
    status: 'online',
    latitude: payload.data.latitude,
    longitude: payload.data.longitude,
    speed: payload.data.speed,
    sessionId,
    timestamp: timestampMs,
  });

  // 7. Check status change
  const previousState = getStatus(payload.device_id);
  const previousStatus = previousState?.status;

  setStatus(payload.device_id, 'online', sessionId);

  if (previousStatus && previousStatus !== 'online') {
    publishInternalEvent('status', {
      device_id: payload.device_id,
      previous_status: previousStatus,
      current_status: 'online',
    });
  }

  // 8. Check alerts - vibration threshold
  if (
    payload.data.vibration !== undefined &&
    payload.data.vibration > VIBRATION_ALERT_THRESHOLD
  ) {
    publishInternalEvent('alert', {
      device_id: payload.device_id,
      alert_type: 'high_vibration',
      value: payload.data.vibration,
      threshold: VIBRATION_ALERT_THRESHOLD,
      latitude: payload.data.latitude,
      longitude: payload.data.longitude,
    });

    logger.info(
      `ALERT: High vibration (${payload.data.vibration}) on device ${payload.device_id}`,
    );
  }
};
