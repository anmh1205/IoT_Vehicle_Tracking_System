import type { RuntimeStateSnapshot } from '../types/device-state.types';

const LIVE_MUTATION_REORDER_TOLERANCE_MS = 15_000;

export const isEngineOffRuntimeState = (runtimeState: RuntimeStateSnapshot): boolean =>
  runtimeState.ignition_state === 'OFF' ||
  runtimeState.vehicle_state === 'PARKED_OFF' ||
  runtimeState.vehicle_state === 'ROLLING_IGN_OFF';

export const hasAuthoritativeSessionIdentity = (params: {
  localSessionKey?: number | null;
  canonicalSessionId?: string | null;
  bootId?: string | null;
}): boolean => {
  const localSessionKey = Number(params.localSessionKey);
  const canonicalSessionId = Number(params.canonicalSessionId?.trim() ?? '');
  const bootId = params.bootId?.trim();

  if (Number.isSafeInteger(canonicalSessionId) && canonicalSessionId > 0) {
    return true;
  }

  return Number.isSafeInteger(localSessionKey) && localSessionKey > 0 && !!bootId;
};

export const telemetryReportsEngineOff = (params: {
  ignition?: boolean;
  runtimeState: RuntimeStateSnapshot;
}): boolean => params.ignition === false || isEngineOffRuntimeState(params.runtimeState);

export const shouldRetainSessionHistory = (params: {
  liveMutationAccepted: boolean;
  resolvedSessionId: number | null;
  hasAuthoritativeIdentity: boolean;
}): boolean =>
  !params.liveMutationAccepted &&
  params.resolvedSessionId !== null &&
  params.hasAuthoritativeIdentity;

export const shouldEnsureSessionForTelemetry = (params: {
  liveMutationAccepted: boolean;
  resolvedSessionId: number | null;
  hasAuthoritativeIdentity: boolean;
  hasFallbackIdentity: boolean;
  isActiveTelemetry: boolean;
}): boolean =>
  params.liveMutationAccepted &&
  params.resolvedSessionId === null &&
  params.isActiveTelemetry &&
  (params.hasAuthoritativeIdentity || params.hasFallbackIdentity);

export const canUseRunningStatusForSession = (params: {
  cachedStatus: 'running' | 'stopped' | 'online';
  runtimeState: RuntimeStateSnapshot;
  hasAuthoritativeIdentity: boolean;
}): boolean => {
  return params.cachedStatus === 'running' &&
    (params.hasAuthoritativeIdentity || !isEngineOffRuntimeState(params.runtimeState));
};

export const normalizeStatusForSessionRuntime = (params: {
  cachedStatus: 'running' | 'stopped' | 'online';
  runtimeState: RuntimeStateSnapshot;
  hasAuthoritativeIdentity: boolean;
}): 'running' | 'stopped' | 'online' => {
  if (canUseRunningStatusForSession(params) || params.cachedStatus !== 'running') {
    return params.cachedStatus;
  }

  return 'stopped';
};

export const shouldAcceptLiveMutation = (params: {
  incomingTimestampMs: number;
  incomingSeqNo?: number;
  incomingBootId?: string | null;
  incomingLocalSessionKey?: number;
  cachedLastPayloadTimestampMs?: number | null;
  cachedLastSeqNo?: number | null;
  cachedBootId?: string | null;
  cachedLocalSessionKey?: number | null;
  persistedWatermarkMs?: number | null;
}): { accept: boolean; reason: string; watermarkMs: number | null } => {
  const watermarkMs = Math.max(
    params.cachedLastPayloadTimestampMs ?? Number.NEGATIVE_INFINITY,
    params.persistedWatermarkMs ?? Number.NEGATIVE_INFINITY,
  );
  const normalizedWatermarkMs = Number.isFinite(watermarkMs) ? watermarkMs : null;

  if (
    normalizedWatermarkMs !== null &&
    params.incomingTimestampMs + LIVE_MUTATION_REORDER_TOLERANCE_MS < normalizedWatermarkMs
  ) {
    return { accept: false, reason: 'stale_timestamp', watermarkMs: normalizedWatermarkMs };
  }

  if (
    params.cachedBootId &&
    params.incomingBootId &&
    params.cachedBootId === params.incomingBootId &&
    params.cachedLastSeqNo !== null &&
    params.cachedLastSeqNo !== undefined &&
    params.incomingSeqNo !== undefined &&
    params.incomingSeqNo < params.cachedLastSeqNo
  ) {
    return { accept: false, reason: 'stale_seq', watermarkMs: normalizedWatermarkMs };
  }

  if (
    normalizedWatermarkMs !== null &&
    params.cachedBootId &&
    params.incomingBootId &&
    params.cachedBootId !== params.incomingBootId &&
    params.incomingTimestampMs <= normalizedWatermarkMs
  ) {
    return { accept: false, reason: 'stale_boot_identity', watermarkMs: normalizedWatermarkMs };
  }

  if (
    normalizedWatermarkMs !== null &&
    params.cachedLocalSessionKey &&
    params.incomingLocalSessionKey &&
    params.cachedLocalSessionKey !== params.incomingLocalSessionKey &&
    params.cachedBootId &&
    params.incomingBootId &&
    params.cachedBootId === params.incomingBootId &&
    params.incomingTimestampMs <= normalizedWatermarkMs
  ) {
    return { accept: false, reason: 'stale_session_identity', watermarkMs: normalizedWatermarkMs };
  }

  return { accept: true, reason: 'fresh', watermarkMs: normalizedWatermarkMs };
};
