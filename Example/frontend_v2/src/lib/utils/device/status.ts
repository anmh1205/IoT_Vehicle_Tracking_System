/**
 * Device status derivation utilities
 * Moved from backend to enable client-side status calculation and realtime updates
 */

export type DeviceStatus = 'running' | 'disconnected' | 'stopped' | null;

/**
 * Normalize device status string to DeviceStatus type
 * @param status - Raw status string from database
 * @returns Normalized status
 */
export const normalizeDeviceStatus = (status: string | null | undefined): DeviceStatus => {
    const value = (status ?? '').toLowerCase();

    if (value === 'running') {
        return 'running';
    }

    if (value === 'disconnected' || value === 'offline') {
        return 'disconnected';
    }

    return 'stopped';
};

/**
 * Derive device status based on current status, last seen time, and timeout
 * @param status - Current status from database
 * @param lastSeenAt - Last seen timestamp (ISO string or Date)
 * @param timeoutSeconds - Timeout in seconds (default: 15)
 * @returns Derived device status
 */
export const deriveDeviceStatus = (
    status: string | null | undefined,
    lastSeenAt: string | Date | null | undefined,
    timeoutSeconds: number = 15
): DeviceStatus => {
    const normalized = normalizeDeviceStatus(status);

    if (!lastSeenAt) {
        return normalized === 'running' ? 'disconnected' : normalized;
    }

    const lastSeen = lastSeenAt instanceof Date ? lastSeenAt : new Date(lastSeenAt);
    if (Number.isNaN(lastSeen.getTime())) {
        return normalized === 'running' ? 'disconnected' : normalized;
    }

    const elapsed = (Date.now() - lastSeen.getTime()) / 1000;
    if (timeoutSeconds > 0 && elapsed > timeoutSeconds && normalized === 'running') {
        return 'disconnected';
    }

    return normalized;
};

/**
 * Calculate device timeout in seconds based on request_interval
 * Formula: timeout = (request_interval_ms / 1000) + OFFLINE_BUFFER_SECONDS
 * If request_interval is null, use default 2000ms (2 seconds)
 * 
 * @param requestInterval - Request interval in milliseconds (null means use default 2000ms)
 * @returns Timeout in seconds
 */
export const calculateDeviceTimeout = (requestInterval: number | null): number => {
    const OFFLINE_BUFFER_SECONDS = 10;
    const intervalMs = requestInterval ?? 2000; // Default 2 seconds if null
    const intervalSeconds = intervalMs / 1000;
    return intervalSeconds + OFFLINE_BUFFER_SECONDS;
};

