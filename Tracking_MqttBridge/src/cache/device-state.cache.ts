import { logger } from '../infrastructure/logger';

interface DeviceState {
  status: 'online' | 'offline' | 'running' | 'stopped';
  sessionId: number | null;
  lastSeenAt: number;
}

const deviceStates = new Map<string, DeviceState>();

let sessionCounter = Date.now();

/**
 * Get the cached status of a device.
 */
export function getStatus(deviceId: string): DeviceState | undefined {
  return deviceStates.get(deviceId);
}

/**
 * Set the cached status of a device.
 */
export function setStatus(
  deviceId: string,
  status: DeviceState['status'],
  sessionId?: number | null,
): void {
  const existing = deviceStates.get(deviceId);
  deviceStates.set(deviceId, {
    status,
    sessionId: sessionId !== undefined ? sessionId : (existing?.sessionId ?? null),
    lastSeenAt: Date.now(),
  });
}

/**
 * Get the current session ID for a device, or create a new one if none exists.
 * Returns [sessionId, isNew] tuple.
 */
export function getOrCreateSession(deviceId: string): [number, boolean] {
  const state = deviceStates.get(deviceId);

  if (state?.sessionId) {
    return [state.sessionId, false];
  }

  sessionCounter += 1;
  const newSessionId = sessionCounter;

  setStatus(deviceId, state?.status ?? 'online', newSessionId);
  logger.debug(`Created new session ${newSessionId} for device ${deviceId}`);

  return [newSessionId, true];
}

/**
 * Clear the session for a device (e.g., when device goes offline or stops).
 */
export function clearSession(deviceId: string): number | null {
  const state = deviceStates.get(deviceId);
  if (!state) return null;

  const oldSessionId = state.sessionId;
  state.sessionId = null;
  state.lastSeenAt = Date.now();

  return oldSessionId;
}

/**
 * Get the total number of tracked devices.
 */
export function getTrackedDeviceCount(): number {
  return deviceStates.size;
}
