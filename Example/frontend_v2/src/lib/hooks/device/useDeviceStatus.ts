/**
 * Hook for device status calculation
 * Wraps device status utilities with React memoization
 */

import { useMemo } from 'react';
import { deriveDeviceStatus, calculateDeviceTimeout, type DeviceStatus } from '../../utils/device/status';

interface UseDeviceStatusProps {
    current_status: string | null;
    last_seen_at: string | null;
    request_interval: number | null;
}

interface UseDeviceStatusReturn {
    status: DeviceStatus;
    timeout: number;
}

/**
 * Hook to calculate device status from raw device data
 * Memoizes calculations for performance
 * 
 * @param device - Device data with current_status, last_seen_at, request_interval
 * @returns Object with derived status and timeout
 */
export function useDeviceStatus({
    current_status,
    last_seen_at,
    request_interval
}: UseDeviceStatusProps): UseDeviceStatusReturn {
    const timeout = useMemo(
        () => calculateDeviceTimeout(request_interval),
        [request_interval]
    );

    const status = useMemo(
        () => deriveDeviceStatus(current_status, last_seen_at, timeout),
        [current_status, last_seen_at, timeout]
    );

    return { status, timeout };
}

