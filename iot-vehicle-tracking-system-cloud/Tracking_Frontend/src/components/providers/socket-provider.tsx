'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/stores/auth-store';

export type RealtimeNamespace = 'dashboard' | 'devices' | 'notifications' | 'exports' | 'firmware';
type RealtimeStatus = 'disconnected' | 'connecting' | 'connected';
type NamespaceSockets = Record<RealtimeNamespace, Socket | null>;
type NamespaceStatuses = Record<RealtimeNamespace, RealtimeStatus>;

interface RealtimeContextValue {
  socket: Socket | null;
  sockets: NamespaceSockets;
  status: RealtimeStatus;
  statuses: NamespaceStatuses;
  getSocket: (namespace?: RealtimeNamespace) => Socket | null;
  joinDeviceRoom: (deviceId: string | number) => void;
  leaveDeviceRoom: (deviceId: string | number) => void;
}

const namespaces: RealtimeNamespace[] = ['dashboard', 'devices', 'notifications', 'exports', 'firmware'];
const adminNamespaces = new Set<RealtimeNamespace>(['firmware']);
const adminRoles = new Set(['root', 'admin']);
const emptySockets = Object.fromEntries(
  namespaces.map((namespace) => [namespace, null]),
) as NamespaceSockets;
const disconnectedStatuses = Object.fromEntries(
  namespaces.map((namespace) => [namespace, 'disconnected']),
) as NamespaceStatuses;

const SocketContext = createContext<RealtimeContextValue | null>(null);

const buildNamespaceUrl = (baseUrl: string, namespace: RealtimeNamespace): string =>
  `${baseUrl.replace(/\/$/, '')}/${namespace}`;

const normalizeSocketUrl = (value: string | undefined): string | null => {
  const normalized = String(value ?? '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\/+$/g, '');

  return normalized || null;
};

const resolveSocketBaseUrl = (): string => {
  const fromEnv = normalizeSocketUrl(process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_SOCKET_URL);
  if (fromEnv) {
    return fromEnv;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:4000';
  }

  const { hostname, origin, protocol } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]') {
    return 'http://localhost:4000';
  }

  if (hostname === 'thingdock.dev' || hostname.endsWith('.thingdock.dev')) {
    return `${protocol}//api.thingdock.dev`;
  }

  return origin;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [sockets, setSockets] = useState<NamespaceSockets>(emptySockets);
  const [statuses, setStatuses] = useState<NamespaceStatuses>(disconnectedStatuses);
  const joinedDeviceIdsRef = useRef<Map<string, number>>(new Map());
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = adminRoles.has(role ?? 'viewer');
  const activeNamespaces = useMemo(
    () => namespaces.filter((namespace) => !adminNamespaces.has(namespace) || isAdmin),
    [isAdmin],
  );

  useEffect(() => {
    if (!token) {
      joinedDeviceIdsRef.current.clear();
      setSockets(emptySockets);
      setStatuses(disconnectedStatuses);
      return;
    }

    setStatuses(
      Object.fromEntries(
        namespaces.map((namespace) => [
          namespace,
          activeNamespaces.includes(namespace) ? 'connecting' : 'disconnected',
        ]),
      ) as NamespaceStatuses,
    );

    const wsUrl = resolveSocketBaseUrl();
    const wsPath = process.env.NEXT_PUBLIC_WS_PATH || '/ws';
    const nextSockets: NamespaceSockets = { ...emptySockets };

    activeNamespaces.forEach((namespace) => {
      nextSockets[namespace] = io(buildNamespaceUrl(wsUrl, namespace), {
        auth: { token },
        path: wsPath,
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
      });
    });

    activeNamespaces.forEach((namespace) => {
      const socket = nextSockets[namespace];
      if (!socket) {
        return;
      }

      socket.on('connect', () => {
        setStatuses((current) => ({ ...current, [namespace]: 'connected' }));
        if (namespace === 'devices') {
          joinedDeviceIdsRef.current.forEach((_count, deviceId) => {
            socket.emit('device:join', { deviceId });
          });
        }
      });
      socket.on('disconnect', () => {
        setStatuses((current) => ({ ...current, [namespace]: 'disconnected' }));
      });
      socket.on('connect_error', () => {
        setStatuses((current) => ({ ...current, [namespace]: 'disconnected' }));
      });
    });

    setSockets(nextSockets);

    return () => {
      activeNamespaces.forEach((namespace) => {
        nextSockets[namespace]?.removeAllListeners();
        nextSockets[namespace]?.disconnect();
      });
      setSockets(emptySockets);
      setStatuses(disconnectedStatuses);
    };
  }, [activeNamespaces, token]);

  const getSocket = useCallback(
    (namespace: RealtimeNamespace = 'dashboard') => sockets[namespace] ?? null,
    [sockets],
  );

  const joinDeviceRoom = useCallback(
    (deviceId: string | number) => {
      if (!deviceId) {
        return;
      }
      const normalizedDeviceId = String(deviceId).trim();
      if (!normalizedDeviceId) {
        return;
      }
      const currentCount = joinedDeviceIdsRef.current.get(normalizedDeviceId) ?? 0;
      joinedDeviceIdsRef.current.set(normalizedDeviceId, currentCount + 1);
      if (currentCount === 0) {
        getSocket('devices')?.emit('device:join', { deviceId: normalizedDeviceId });
      }
    },
    [getSocket],
  );

  const leaveDeviceRoom = useCallback(
    (deviceId: string | number) => {
      if (!deviceId) {
        return;
      }
      const normalizedDeviceId = String(deviceId).trim();
      if (!normalizedDeviceId) {
        return;
      }
      const currentCount = joinedDeviceIdsRef.current.get(normalizedDeviceId) ?? 0;
      if (currentCount > 1) {
        joinedDeviceIdsRef.current.set(normalizedDeviceId, currentCount - 1);
        return;
      }
      joinedDeviceIdsRef.current.delete(normalizedDeviceId);
      getSocket('devices')?.emit('device:leave', { deviceId: normalizedDeviceId });
    },
    [getSocket],
  );

  const status = statuses.dashboard;
  const value = useMemo<RealtimeContextValue>(
    () => ({
      socket: sockets.dashboard,
      sockets,
      status,
      statuses,
      getSocket,
      joinDeviceRoom,
      leaveDeviceRoom,
    }),
    [sockets, status, statuses, getSocket, joinDeviceRoom, leaveDeviceRoom],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

export const useSocket = (namespace: RealtimeNamespace = 'dashboard') =>
  useContext(SocketContext)?.getSocket(namespace) ?? null;

export const useRealtimeContext = (): RealtimeContextValue => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within SocketProvider');
  }
  return context;
};

export const useDeviceRoom = (
  deviceId: string | number | null | undefined,
  enabled = true,
) => {
  const { joinDeviceRoom, leaveDeviceRoom } = useRealtimeContext();

  useEffect(() => {
    if (!enabled || !deviceId) {
      return;
    }

    joinDeviceRoom(deviceId);
    return () => {
      leaveDeviceRoom(deviceId);
    };
  }, [deviceId, enabled, joinDeviceRoom, leaveDeviceRoom]);
};
