'use client';

import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';

interface UseDeviceRuntimeRealtimeProps {
    baseQuarterRuntime: number; // Base quarter runtime in seconds from backend
    baseTotalRuntime: number; // Base total runtime in seconds from backend
    currentStatus: 'running' | 'disconnected' | 'stopped' | null;
    lastSeenAt: string | null; // ISO timestamp
    sessionStart?: string | null; // ISO timestamp of current session start (if running)
}

interface UseDeviceRuntimeRealtimeReturn {
    quarterRuntime: number; // Real-time quarter runtime in seconds
    totalRuntime: number; // Real-time total runtime in seconds
    currentSessionRuntime: number; // Real-time current session runtime in seconds (if running)
}

/**
 * Hook to calculate real-time runtime for device
 * Updates every second when device is running
 * 
 * Logic:
 * - If device is running: runtime = base + elapsed (from lastSeenAt to now)
 * - If device is disconnected: runtime = base (backend already calculated up to disconnection point)
 * - If device is stopped: runtime = base (no realtime counting)
 * - Quarter runtime: base + elapsed (if running)
 * - Total runtime: base + elapsed (if running)
 * - Current session runtime: elapsed since session_start (if running)
 * 
 * Note: When device disconnects, backend calculates runtime up to (last_seen_at + timeout),
 * so frontend should use base value without adding elapsed time.
 */
export const useDeviceRuntimeRealtime = ({
    baseQuarterRuntime,
    baseTotalRuntime,
    currentStatus,
    lastSeenAt,
    sessionStart,
}: UseDeviceRuntimeRealtimeProps): UseDeviceRuntimeRealtimeReturn => {
    const [quarterRuntime, setQuarterRuntime] = useState<number>(baseQuarterRuntime);
    const [totalRuntime, setTotalRuntime] = useState<number>(baseTotalRuntime);
    const [currentSessionRuntime, setCurrentSessionRuntime] = useState<number>(0);

    const intervalRef = useRef<number | null>(null);
    const baseQuarterRef = useRef<number>(baseQuarterRuntime);
    const baseTotalRef = useRef<number>(baseTotalRuntime);

    // Update base values when props change
    useEffect(() => {
        baseQuarterRef.current = baseQuarterRuntime;
        baseTotalRef.current = baseTotalRuntime;
        setQuarterRuntime(baseQuarterRuntime);
        setTotalRuntime(baseTotalRuntime);
    }, [baseQuarterRuntime, baseTotalRuntime]);

    useEffect(() => {
        // Clear any existing interval first
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        const updateRuntime = () => {
            const now = dayjs();
            
            // If device is running and we have lastSeenAt
            if (currentStatus === 'running' && lastSeenAt) {
                const lastSeen = dayjs(lastSeenAt);
                if (lastSeen.isValid()) {
                    // Calculate elapsed time since lastSeenAt
                    const elapsed = now.diff(lastSeen, 'second');
                    if (elapsed >= 0) {
                        // Runtime = base + elapsed time since last seen
                        const newQuarter = baseQuarterRef.current + elapsed;
                        const newTotal = baseTotalRef.current + elapsed;
                        setQuarterRuntime(newQuarter);
                        setTotalRuntime(newTotal);
                    } else {
                        // Invalid elapsed, use base values
                        setQuarterRuntime(baseQuarterRef.current);
                        setTotalRuntime(baseTotalRef.current);
                    }
                } else {
                    // Invalid lastSeenAt, use base values
                    setQuarterRuntime(baseQuarterRef.current);
                    setTotalRuntime(baseTotalRef.current);
                }
            } else if (currentStatus === 'disconnected' && lastSeenAt) {
                // Device is disconnected: stop counting at lastSeenAt + timeout (10 seconds)
                // Backend already calculated runtime up to disconnection point, so use base values
                // But we need to ensure we don't continue counting
                const lastSeen = dayjs(lastSeenAt);
                if (lastSeen.isValid()) {
                    // Use base values (backend already includes runtime up to disconnection)
                    setQuarterRuntime(baseQuarterRef.current);
                    setTotalRuntime(baseTotalRef.current);
                } else {
                    // Invalid lastSeenAt, use base values
                    setQuarterRuntime(baseQuarterRef.current);
                    setTotalRuntime(baseTotalRef.current);
                }
            } else {
                // Device stopped or no status, use base values (no realtime counting)
                setQuarterRuntime(baseQuarterRef.current);
                setTotalRuntime(baseTotalRef.current);
            }

            // Calculate current session runtime if running
            if (currentStatus === 'running' && sessionStart) {
                const sessionStartMoment = dayjs(sessionStart);
                if (sessionStartMoment.isValid()) {
                    const sessionElapsed = now.diff(sessionStartMoment, 'second');
                    setCurrentSessionRuntime(Math.max(0, sessionElapsed));
                } else {
                    setCurrentSessionRuntime(0);
                }
            } else {
                setCurrentSessionRuntime(0);
            }
        };

        // Initial update
        updateRuntime();

        // Update every second
        intervalRef.current = window.setInterval(updateRuntime, 1000);

        return () => {
            if (intervalRef.current !== null) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [currentStatus, lastSeenAt, sessionStart]);

    return {
        quarterRuntime,
        totalRuntime,
        currentSessionRuntime,
    };
};

