import type { RuntimeStateSnapshot } from '../types/device-state.types';

interface DeviceState {
  status: 'online' | 'offline' | 'running' | 'stopped';
  sessionId: number | null;
  lastSeenAt: number;
  lastPayloadTimestampMs: number | null;
  lastSeqNo: number | null;
  runtimeState: RuntimeStateSnapshot | null;
  localSessionKey: number | null;
  canonicalSessionId: string | null;
  bootId: string | null;
}

interface DeviceStateUpdate {
  sessionId?: number | null;
  lastPayloadTimestampMs?: number | null;
  lastSeqNo?: number | null;
  runtimeState?: RuntimeStateSnapshot | null;
  localSessionKey?: number | null;
  canonicalSessionId?: string | null;
  bootId?: string | null;
}

const deviceStates = new Map<string, DeviceState>();

const normalizeCanonicalSessionId = (
  canonicalSessionId: string | null | undefined,
): string | null => {
  const normalized = canonicalSessionId?.trim();
  return normalized ? normalized : null;
};

const parseCanonicalSessionId = (
  canonicalSessionId: string | null | undefined,
): number | null => {
  const normalized = normalizeCanonicalSessionId(canonicalSessionId);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getStatus = (deviceId: string): DeviceState | undefined => {
  return deviceStates.get(deviceId);
};

export const setStatus = (
  deviceId: string,
  status: DeviceState['status'],
  update: DeviceStateUpdate = {},
): void => {
  const existing = deviceStates.get(deviceId);
  const parsedCanonicalSessionId = parseCanonicalSessionId(update.canonicalSessionId);

  deviceStates.set(deviceId, {
    status,
    sessionId:
      update.sessionId !== undefined
        ? update.sessionId
        : (existing?.sessionId ?? parsedCanonicalSessionId ?? null),
    lastSeenAt: Date.now(),
    lastPayloadTimestampMs:
      update.lastPayloadTimestampMs !== undefined
        ? update.lastPayloadTimestampMs
        : (existing?.lastPayloadTimestampMs ?? null),
    lastSeqNo:
      update.lastSeqNo !== undefined
        ? update.lastSeqNo
        : (existing?.lastSeqNo ?? null),
    runtimeState:
      update.runtimeState !== undefined ? update.runtimeState : (existing?.runtimeState ?? null),
    localSessionKey:
      update.localSessionKey !== undefined
        ? update.localSessionKey
        : (existing?.localSessionKey ?? null),
    canonicalSessionId:
      update.canonicalSessionId !== undefined
        ? normalizeCanonicalSessionId(update.canonicalSessionId)
        : (existing?.canonicalSessionId ?? null),
    bootId: update.bootId !== undefined ? update.bootId : (existing?.bootId ?? null),
  });
};

export const clearSession = (deviceId: string): number | null => {
  const state = deviceStates.get(deviceId);
  if (!state) {
    return null;
  }

  const oldSessionId = state.sessionId;
  state.sessionId = null;
  state.lastSeenAt = Date.now();
  state.canonicalSessionId = null;

  return oldSessionId;
};

export const resolveSessionId = (
  deviceId: string,
  sessionIdentity: {
    localSessionKey?: number;
    canonicalSessionId?: string | null;
    bootId?: string | null;
  },
): number | null => {
  const canonicalSessionId = parseCanonicalSessionId(sessionIdentity.canonicalSessionId);
  if (canonicalSessionId !== null) {
    return canonicalSessionId;
  }

  const state = deviceStates.get(deviceId);
  if (!state || state.sessionId === null) {
    return null;
  }

  if (
    sessionIdentity.localSessionKey !== undefined &&
    state.localSessionKey === sessionIdentity.localSessionKey
  ) {
    if (state.bootId && sessionIdentity.bootId !== state.bootId) {
      return null;
    }
    return state.sessionId;
  }

  if (
    sessionIdentity.localSessionKey === undefined &&
    sessionIdentity.bootId &&
    state.status === 'running' &&
    state.bootId === sessionIdentity.bootId
  ) {
    return state.sessionId;
  }

  return null;
};

export const getTrackedDeviceCount = (): number => {
  return deviceStates.size;
};
