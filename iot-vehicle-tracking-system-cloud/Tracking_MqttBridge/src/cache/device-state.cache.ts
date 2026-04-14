interface DeviceState {
  status: 'online' | 'offline' | 'running' | 'stopped';
  sessionId: number | null;
  lastSeenAt: number;
}

const deviceStates = new Map<string, DeviceState>();

/**
 * Get the cached status of a device.
 */
export const getStatus = (deviceId: string): DeviceState | undefined => {
  return deviceStates.get(deviceId);
};

/**
 * Set the cached status of a device.
 */
export const setStatus = (
  deviceId: string,
  status: DeviceState['status'],
  sessionId?: number | null,
): void => {
  const existing = deviceStates.get(deviceId);
  deviceStates.set(deviceId, {
    status,
    sessionId: sessionId !== undefined ? sessionId : (existing?.sessionId ?? null),
    lastSeenAt: Date.now(),
  });
};

/**
 * Clear the session for a device (e.g., when device goes offline or stops).
 */
export const clearSession = (deviceId: string): number | null => {
  const state = deviceStates.get(deviceId);
  if (!state) return null;

  const oldSessionId = state.sessionId;
  state.sessionId = null;
  state.lastSeenAt = Date.now();

  return oldSessionId;
};

/**
 * Get the total number of tracked devices.
 */
export const getTrackedDeviceCount = (): number => {
  return deviceStates.size;
};
