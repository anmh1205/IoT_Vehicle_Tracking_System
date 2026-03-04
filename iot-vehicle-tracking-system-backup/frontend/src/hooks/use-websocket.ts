'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store/auth-store';

interface LocationUpdate {
    vehicleId: number;
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    timestamp: string;
}

interface UseWebSocketOptions {
    onLocationUpdate?: (data: LocationUpdate) => void;
    onAlert?: (data: any) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const socketRef = useRef<Socket | null>(null);
    const { accessToken } = useAuthStore();

    const connect = useCallback(() => {
        if (socketRef.current?.connected) return;

        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

        socketRef.current = io(wsUrl, {
            auth: { token: accessToken },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socketRef.current.on('connect', () => {
            console.log('WebSocket connected');
            options.onConnect?.();
        });

        socketRef.current.on('disconnect', () => {
            console.log('WebSocket disconnected');
            options.onDisconnect?.();
        });

        // Listen for location updates
        socketRef.current.on('location:update', (data: LocationUpdate) => {
            options.onLocationUpdate?.(data);
        });

        // Listen for alerts
        socketRef.current.on('alert:new', (data: any) => {
            options.onAlert?.(data);
        });
    }, [accessToken, options]);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    }, []);

    const subscribeToVehicle = useCallback((vehicleId: number) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('subscribe:vehicle', { vehicleId });
        }
    }, []);

    const unsubscribeFromVehicle = useCallback((vehicleId: number) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('unsubscribe:vehicle', { vehicleId });
        }
    }, []);

    const subscribeToAll = useCallback(() => {
        if (socketRef.current?.connected) {
            socketRef.current.emit('subscribe:all');
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        socket: socketRef.current,
        connect,
        disconnect,
        subscribeToVehicle,
        unsubscribeFromVehicle,
        subscribeToAll,
        isConnected: socketRef.current?.connected ?? false,
    };
}
