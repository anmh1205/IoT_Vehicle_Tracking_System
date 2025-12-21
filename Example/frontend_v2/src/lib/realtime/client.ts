"use client";

import { io, type Socket } from "socket.io-client";

export type NamespaceKey = "dashboard" | "devices" | "firmware" | "exports" | "notifications";

const socketCache: Partial<Record<NamespaceKey, Socket>> = {};
const DEFAULT_WS_PATH = "/ws";
const DEV_BACKEND_PORT = "3000";

const deriveBaseUrl = (): string => {
    const envUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
    if (envUrl) {
        return envUrl.replace(/\/$/, "");
    }

    if (typeof window !== "undefined") {
        const { origin } = window.location;
        // Handle both frontend v1 (3001) and v2 (3002) - both connect to backend on 3000
        if (origin.includes(":3001") || origin.includes(":3002")) {
            return origin.replace(/:\d+/, `:${DEV_BACKEND_PORT}`);
        }
        return origin;
    }

    return `http://localhost:${DEV_BACKEND_PORT}`;
};

const getSocketOptions = (token?: string | null) => ({
    path: process.env.NEXT_PUBLIC_WS_PATH || DEFAULT_WS_PATH,
    transports: ["websocket", "polling"], // Allow fallback to polling if websocket fails
    withCredentials: true,
    autoConnect: false,
    auth: token ? { token } : undefined,
    timeout: 45000, // 45 seconds connection timeout - match backend connectTimeout
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
    forceNew: false, // Reuse existing connection if available
    upgrade: true // Allow transport upgrade
});

export const getRealtimeSocket = (namespace: NamespaceKey, token?: string | null): Socket => {
    if (!socketCache[namespace]) {
        const baseUrl = `${deriveBaseUrl()}/${namespace}`;
        const options = getSocketOptions(token);
        socketCache[namespace] = io(baseUrl, options);
    }

    const socket = socketCache[namespace]!;
    const oldAuth = socket.auth;
    socket.auth = token ? { token } : {};
    
    // If socket is disconnected or has error, force reconnect when auth changes
    const authChanged = JSON.stringify(oldAuth) !== JSON.stringify(socket.auth);
    if (authChanged && (socket.disconnected || !socket.connected)) {
        socket.disconnect(); // Disconnect first to clear state
        socket.connect(); // Then reconnect
    }
    
    // Always ensure socket is trying to connect if not connected and not already connecting
    if (!socket.connected && !socket.active) {
        socket.connect();
    }
    
    return socket;
};

export const disconnectRealtimeSocket = (namespace?: NamespaceKey): void => {
    if (namespace) {
        socketCache[namespace]?.disconnect();
        delete socketCache[namespace];
        return;
    }

    Object.keys(socketCache).forEach((key) => {
        const typedKey = key as NamespaceKey;
        socketCache[typedKey]?.disconnect();
        delete socketCache[typedKey];
    });
};

export const clearSocketCache = (namespace?: NamespaceKey): void => {
    if (namespace) {
        const socket = socketCache[namespace];
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
            delete socketCache[namespace];
        }
        return;
    }

    Object.keys(socketCache).forEach((key) => {
        const typedKey = key as NamespaceKey;
        const socket = socketCache[typedKey];
        if (socket) {
            socket.removeAllListeners();
            socket.disconnect();
            delete socketCache[typedKey];
        }
    });
};


