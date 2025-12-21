/**
 * Hook for device runtime calculation
 * Wraps runtime utilities with React memoization
 */

import { useMemo } from 'react';
import { calculateRealtimeRuntime } from '../../utils/device/runtime';

interface UseDeviceRuntimeProps {
    baseRuntimeSeconds: number;
    lastSeenAt: string | Date | null;
    currentStatus: string | null;
    runningSession: { session_start: string } | null;
}

interface UseDeviceRuntimeReturn {
    realtimeRuntime: number;
}

/**
 * Hook to calculate realtime runtime for a device
 * Memoizes calculations for performance
 * 
 * @param props - Device runtime data
 * @returns Object with realtime runtime in seconds
 */
export function useDeviceRuntime({
    baseRuntimeSeconds,
    lastSeenAt,
    currentStatus,
    runningSession
}: UseDeviceRuntimeProps): UseDeviceRuntimeReturn {
    const realtimeRuntime = useMemo(
        () => calculateRealtimeRuntime(
            baseRuntimeSeconds,
            lastSeenAt,
            currentStatus,
            runningSession
        ),
        [baseRuntimeSeconds, lastSeenAt, currentStatus, runningSession]
    );

    return { realtimeRuntime };
}

