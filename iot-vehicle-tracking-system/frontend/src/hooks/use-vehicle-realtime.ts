/**
 * useVehicleRealtime Hook - Real-time vehicle location and status updates
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket } from '@/lib/realtime/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import type { TelemetryData } from '@/types';

interface VehicleRealtimeData {
    vehicleId: number;
    telemetry: TelemetryData;
    timestamp: string;
}

interface UseVehicleRealtimeOptions {
    vehicleId?: number;
    onUpdate?: (data: VehicleRealtimeData) => void;
}

export function useVehicleRealtime({ vehicleId, onUpdate }: UseVehicleRealtimeOptions = {}) {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<VehicleRealtimeData | null>(null);

    useEffect(() => {
        if (!token) return;

        const socket = getRealtimeSocket('vehicles', token);

        socket.on('connect', () => {
            setIsConnected(true);
            // Subscribe to specific vehicle if provided
            if (vehicleId) {
                socket.emit('subscribe:vehicle', { vehicleId });
            }
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Listen for telemetry updates
        socket.on('vehicle:telemetry', (data: VehicleRealtimeData) => {
            if (!vehicleId || data.vehicleId === vehicleId) {
                setLastUpdate(data);
                onUpdate?.(data);
                // Invalidate vehicle query to refresh data
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLE(data.vehicleId) });
            }
        });

        // Listen for status changes
        socket.on('vehicle:status', (data: { vehicleId: number; status: string }) => {
            if (!vehicleId || data.vehicleId === vehicleId) {
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLE(data.vehicleId) });
                queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
            }
        });

        return () => {
            if (vehicleId) {
                socket.emit('unsubscribe:vehicle', { vehicleId });
            }
            socket.off('vehicle:telemetry');
            socket.off('vehicle:status');
        };
    }, [token, vehicleId, onUpdate, queryClient]);

    return { isConnected, lastUpdate };
}
