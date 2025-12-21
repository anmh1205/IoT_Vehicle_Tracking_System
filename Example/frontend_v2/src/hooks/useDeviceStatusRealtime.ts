import { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';

export type DeviceStatus = 'running' | 'disconnected' | 'stopped' | null;

interface UseDeviceStatusRealtimeProps {
    last_seen_at: string | null;
    request_interval: number | null;
    current_status: DeviceStatus;
}

interface UseDeviceStatusRealtimeReturn {
    status: DeviceStatus;
    timeRemaining: number; // seconds remaining until timeout
    progress: number; // 0-100, percentage of timeout elapsed
    isNearTimeout: boolean; // true if timeRemaining < 3 seconds
}

/**
 * Hook to calculate device status in real-time based on last_seen_at and request_interval
 * Updates every second to provide smooth UI experience
 * 
 * Logic: timeout = (request_interval / 1000) + 10 seconds
 * If elapsed > timeout and status was 'running', return 'disconnected'
 */
export const useDeviceStatusRealtime = ({
    last_seen_at,
    request_interval,
    current_status
}: UseDeviceStatusRealtimeProps): UseDeviceStatusRealtimeReturn => {
    const [status, setStatus] = useState<DeviceStatus>(current_status);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [progress, setProgress] = useState<number>(0);
    const [isNearTimeout, setIsNearTimeout] = useState<boolean>(false);

    const intervalRef = useRef<number | null>(null);
    const currentStatusRef = useRef<DeviceStatus>(current_status);

    // Sync current_status ref when it changes
    useEffect(() => {
        currentStatusRef.current = current_status;
    }, [current_status]);

    useEffect(() => {
        // Clear any existing interval first
        if (intervalRef.current !== null) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // Calculate timeout in seconds
        const OFFLINE_BUFFER_SECONDS = 10;
        const intervalMs = request_interval ?? 2000; // Default 2 seconds if null
        const intervalSeconds = intervalMs / 1000;
        const timeoutSeconds = intervalSeconds + OFFLINE_BUFFER_SECONDS;

        const updateStatus = () => {
            // Get latest current_status from ref
            const latestStatus = currentStatusRef.current;

            if (!last_seen_at) {
                // No last_seen_at, use current status
                const newStatus = latestStatus === 'running' ? 'disconnected' : latestStatus;
                setStatus(newStatus);
                setTimeRemaining(0);
                setProgress(100);
                setIsNearTimeout(false);
                return;
            }

            const lastSeen = dayjs(last_seen_at);
            if (!lastSeen.isValid()) {
                const newStatus = latestStatus === 'running' ? 'disconnected' : latestStatus;
                setStatus(newStatus);
                setTimeRemaining(0);
                setProgress(100);
                setIsNearTimeout(false);
                return;
            }

            const now = dayjs();
            const elapsedSeconds = now.diff(lastSeen, 'second');
            const remaining = Math.max(0, timeoutSeconds - elapsedSeconds);

            // Calculate progress (0-100)
            const progressValue = Math.min(100, (elapsedSeconds / timeoutSeconds) * 100);

            // Check if near timeout (less than 3 seconds remaining)
            const nearTimeout = remaining > 0 && remaining < 3;

            // Update status: if elapsed > timeout and was running, mark as disconnected
            let newStatus: DeviceStatus;
            if (elapsedSeconds > timeoutSeconds && latestStatus === 'running') {
                newStatus = 'disconnected';
            } else {
                newStatus = latestStatus;
            }

            setStatus(newStatus);
            setTimeRemaining(remaining);
            setProgress(progressValue);
            setIsNearTimeout(nearTimeout);
        };

        // Initial update
        updateStatus();

        // Update every second - use window.setInterval for browser compatibility
        intervalRef.current = window.setInterval(updateStatus, 1000);

        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [last_seen_at, request_interval]); // current_status is synced via ref, no need in deps

    return {
        status,
        timeRemaining,
        progress,
        isNearTimeout
    };
};

