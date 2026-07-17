import { useEffect, useMemo, useState } from 'react';
export type DeviceRealtimeStatus = 'running' | 'stopped' | 'disconnected' | 'online';
interface DeriveDeviceStatusParams {
  lastSeenAt?: string | Date | null;
  requestInterval?: number | null;
  serverStatus?: DeviceRealtimeStatus | null;
  stoppedMultiplier?: number;
  disconnectedMultiplier?: number;
  nowMs?: number;
}
interface UseDeviceStatusRealtimeParams extends DeriveDeviceStatusParams {
  tickMs?: number;
}
export interface DeviceStatusRealtimeState {
  status: DeviceRealtimeStatus;
  isOnline: boolean;
  secondsSinceLastSeen: number | null;
}
const MIN_INTERVAL_SECONDS = 10;
const DEFAULT_INTERVAL_SECONDS = 60;
const DEFAULT_STOPPED_MULTIPLIER = 2;
const DEFAULT_DISCONNECTED_MULTIPLIER = 6;
const parseLastSeenAt = (value?: string | Date | null): number | null => {
  if (!value) {
    return null;
  }
  const timestamp = typeof value === 'string' ? Date.parse(value) : value.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};
export const deriveDeviceStatus = ({
  lastSeenAt,
  requestInterval,
  serverStatus,
  stoppedMultiplier = DEFAULT_STOPPED_MULTIPLIER,
  disconnectedMultiplier = DEFAULT_DISCONNECTED_MULTIPLIER,
  nowMs = Date.now(),
}: DeriveDeviceStatusParams): DeviceStatusRealtimeState => {
  const lastSeenMs = parseLastSeenAt(lastSeenAt);
  if (!lastSeenMs) {
    const status = serverStatus ?? 'disconnected';
    return {
      status,
      isOnline: status !== 'disconnected',
      secondsSinceLastSeen: null,
    };
  }
  const secondsSinceLastSeen = Math.max(0, Math.floor((nowMs - lastSeenMs) / 1000));
  const intervalSeconds = Math.max(
    MIN_INTERVAL_SECONDS,
    Math.floor(requestInterval ?? DEFAULT_INTERVAL_SECONDS),
  );
  const stoppedThreshold = intervalSeconds * stoppedMultiplier;
  const disconnectedThreshold = intervalSeconds * disconnectedMultiplier;
  let status: DeviceRealtimeStatus = 'disconnected';
  if (secondsSinceLastSeen <= stoppedThreshold) {
    status = 'running';
  } else if (secondsSinceLastSeen <= disconnectedThreshold) {
    status = 'stopped';
  }
  if (serverStatus === 'disconnected') {
    status = 'disconnected';
  } else if (serverStatus) {
    status = serverStatus;
  }
  return {
    status,
    isOnline: status !== 'disconnected',
    secondsSinceLastSeen,
  };
};
export const useDeviceStatusRealtime = (
  params: UseDeviceStatusRealtimeParams,
): DeviceStatusRealtimeState => {
  const tickMs = params.tickMs ?? 10000;
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (tickMs <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, tickMs);
    return () => {
      window.clearInterval(timer);
    };
  }, [tickMs]);
  return useMemo(
    () =>
      deriveDeviceStatus({
        ...params,
        nowMs,
      }),
    [params, nowMs],
  );
};
