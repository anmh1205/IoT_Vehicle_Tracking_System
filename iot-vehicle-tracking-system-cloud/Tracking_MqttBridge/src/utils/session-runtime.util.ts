import type { RuntimeStateSnapshot } from '../types/device-state.types';

export const isEngineOffRuntimeState = (runtimeState: RuntimeStateSnapshot): boolean =>
  runtimeState.ignition_state === 'OFF' ||
  runtimeState.vehicle_state === 'PARKED_OFF' ||
  runtimeState.vehicle_state === 'ROLLING_IGN_OFF';

export const hasAuthoritativeSessionIdentity = (params: {
  localSessionKey?: number | null;
  canonicalSessionId?: string | null;
}): boolean => {
  const localSessionKey = Number(params.localSessionKey);
  const canonicalSessionId = Number(params.canonicalSessionId?.trim() ?? '');

  return (
    (Number.isSafeInteger(localSessionKey) && localSessionKey > 0) ||
    (Number.isSafeInteger(canonicalSessionId) && canonicalSessionId > 0)
  );
};

export const telemetryReportsEngineOff = (params: {
  ignition?: boolean;
  runtimeState: RuntimeStateSnapshot;
}): boolean => params.ignition === false || isEngineOffRuntimeState(params.runtimeState);

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
