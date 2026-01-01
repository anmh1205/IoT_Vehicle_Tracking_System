"use client";

import { io, type Socket } from "socket.io-client";

export type NamespaceKey =
  | "dashboard"
  | "vehicles"
  | "trips"
  | "alerts"
  | "notifications";

const socketCache: Partial<Record<NamespaceKey, Socket>> = {};
const DEFAULT_WS_PATH = "/ws";

const deriveBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { origin } = window.location;
    if (origin.includes(":3001") || origin.includes(":3002")) {
      return origin.replace(/:\d+/, ":3000");
    }
    return origin;
  }

  return "http://localhost:3000";
};

const getSocketOptions = (token?: string | null) => ({
  path: process.env.NEXT_PUBLIC_WS_PATH || DEFAULT_WS_PATH,
  transports: ["websocket", "polling"],
  withCredentials: true,
  autoConnect: false,
  auth: token ? { token } : undefined,
  timeout: 45000,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  forceNew: false,
  upgrade: true,
});

export const getRealtimeSocket = (
  namespace: NamespaceKey,
  token?: string | null
): Socket => {
  if (!socketCache[namespace]) {
    const baseUrl = `${deriveBaseUrl()}/${namespace}`;
    const options = getSocketOptions(token);
    socketCache[namespace] = io(baseUrl, options);
  }

  const socket = socketCache[namespace]!;
  const oldAuth = socket.auth;
  socket.auth = token ? { token } : {};

  const authChanged =
    JSON.stringify(oldAuth) !== JSON.stringify(socket.auth);
  if (authChanged && (socket.disconnected || !socket.connected)) {
    socket.disconnect();
    socket.connect();
  }

  if (!socket.connected && !socket.active) {
    socket.connect();
  }

  return socket;
};

export const disconnectRealtimeSocket = (
  namespace?: NamespaceKey
): void => {
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

