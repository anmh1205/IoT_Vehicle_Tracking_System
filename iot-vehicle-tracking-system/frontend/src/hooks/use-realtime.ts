/**
 * useRealtime Hook - Subscribe to real-time updates
 */
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getRealtimeSocket, disconnectRealtimeSocket, type NamespaceKey } from '@/lib/realtime/client';
import { useAuthStore } from '@/lib/store/auth-store';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import type { Socket } from 'socket.io-client';

interface UseRealtimeOptions {
    namespace: NamespaceKey;
    events?: string[];
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Error) => void;
}

export function useRealtime({
    namespace,
    events = [],
    onConnect,
    onDisconnect,
    onError,
}: UseRealtimeOptions) {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!token) return;

        const socket = getRealtimeSocket(namespace, token);
        socketRef.current = socket;

        // Connection handlers
        socket.on('connect', () => {
            console.log(`[Realtime] Connected to ${namespace}`);
            onConnect?.();
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Realtime] Disconnected from ${namespace}: ${reason}`);
            onDisconnect?.();
        });

        socket.on('connect_error', (error) => {
            console.error(`[Realtime] Connection error on ${namespace}:`, error);
            onError?.(error);
        });

        // Subscribe to specified events
        events.forEach((event) => {
            socket.on(event, (data) => {
                console.log(`[Realtime] ${namespace}:${event}`, data);
                // Invalidate relevant queries based on namespace
                invalidateQueriesForNamespace(namespace, queryClient);
            });
        });

        return () => {
            events.forEach((event) => socket.off(event));
            socket.off('connect');
            socket.off('disconnect');
            socket.off('connect_error');
        };
    }, [token, namespace, events, onConnect, onDisconnect, onError, queryClient]);

    const emit = useCallback((event: string, data?: unknown) => {
        socketRef.current?.emit(event, data);
    }, []);

    const disconnect = useCallback(() => {
        disconnectRealtimeSocket(namespace);
    }, [namespace]);

    return { emit, disconnect, socket: socketRef.current };
}

function invalidateQueriesForNamespace(namespace: NamespaceKey, queryClient: ReturnType<typeof useQueryClient>) {
    switch (namespace) {
        case 'dashboard':
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            break;
        case 'vehicles':
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VEHICLES });
            break;
        case 'trips':
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TRIPS });
            break;
        case 'alerts':
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALERTS });
            break;
        case 'notifications':
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.NOTIFICATIONS });
            break;
    }
}
