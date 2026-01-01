/**
 * useAlertRealtime Hook - Real-time alert notifications
 */
'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { toast } from 'sonner';
import type { Alert } from '@/types';

interface UseAlertRealtimeOptions {
    showToast?: boolean;
    onNewAlert?: (alert: Alert) => void;
}

export function useAlertRealtime({ showToast = true, onNewAlert }: UseAlertRealtimeOptions = {}) {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const [isConnected, setIsConnected] = useState(false);
    const [newAlertsCount, setNewAlertsCount] = useState(0);

    useEffect(() => {
        if (!token) return;

        const socket = getRealtimeSocket('alerts', token);

        socket.on('connect', () => {
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Listen for new alerts
        socket.on('alert:new', (alert: Alert) => {
            setNewAlertsCount((prev) => prev + 1);
            onNewAlert?.(alert);

            // Show toast notification
            if (showToast) {
                const severity = alert.severity;
                const toastFn = severity === 'critical' ? toast.error :
                    severity === 'high' ? toast.warning : toast.info;
                toastFn(`New Alert: ${alert.message}`, {
                    description: `Vehicle #${alert.vehicleId}`,
                    action: {
                        label: 'View',
                        onClick: () => window.location.href = `/dashboard/alerts/${alert.id}`,
                    },
                });
            }

            // Invalidate alerts queries
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERTS });
        });

        // Listen for alert status changes
        socket.on('alert:update', (data: { alertId: number; status: string }) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERT(data.alertId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERTS });
        });

        return () => {
            socket.off('alert:new');
            socket.off('alert:update');
        };
    }, [token, showToast, onNewAlert, queryClient]);

    const resetNewAlertsCount = () => setNewAlertsCount(0);

    return { isConnected, newAlertsCount, resetNewAlertsCount };
}
