/**
 * Device runtime calculation utilities
 * Moved from backend to enable client-side runtime calculation
 */

/**
 * Calculate realtime runtime for a device
 * This calculates the current runtime including any active session
 * 
 * @param baseRuntimeSeconds - Base runtime from database (total of all closed sessions)
 * @param lastSeenAt - Last seen timestamp (ISO string or Date)
 * @param currentStatus - Current device status
 * @param runningSession - Active running session (if any) with session_start
 * @returns Total runtime in seconds including active session
 */
export const calculateRealtimeRuntime = (
    baseRuntimeSeconds: number,
    lastSeenAt: string | Date | null,
    currentStatus: string | null,
    runningSession: { session_start: string } | null
): number => {
    // If device is stopped, return base runtime (no active session)
    if (currentStatus === 'stopped') {
        return baseRuntimeSeconds;
    }

    // If no running session, return base runtime
    if (!runningSession || !runningSession.session_start) {
        return baseRuntimeSeconds;
    }

    // Calculate uptime for running session
    const sessionStart = new Date(runningSession.session_start);
    if (Number.isNaN(sessionStart.getTime())) {
        return baseRuntimeSeconds;
    }

    const now = new Date();
    const sessionUptime = Math.floor((now.getTime() - sessionStart.getTime()) / 1000);

    // Add session uptime to base runtime
    return baseRuntimeSeconds + Math.max(0, sessionUptime);
};

