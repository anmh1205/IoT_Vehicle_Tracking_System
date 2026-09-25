import type { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';

import { corsConfig } from '@/config/env';
import { pool } from '@/infrastructure/database/pool';
import { createLogger } from '@/infrastructure/logger';
import { socketAuthMiddleware } from './socket-auth.middleware';
import { subscribeEvent } from './event-bus.util';
import {
  incrementNamespaceConnection,
  decrementNamespaceConnection,
  recordEventEmission,
} from './health';
import type { NamespaceKey, TypedIOServer, TypedSocket } from './types';

const log = createLogger('realtime');

const WS_NAMESPACES: NamespaceKey[] = [
  'dashboard',
  'devices',
  'notifications',
  'exports',
  'firmware',
];

const GLOBAL_DEVICE_ACCESS_ROLES = new Set(['root', 'admin']);
const SYSTEM_ADMIN_ROLES = new Set(['root', 'admin']);
const SYSTEM_ADMIN_ROOM = 'role:system-admin';
const MAX_DEVICE_ROOM_JOINS = 500;

let io: TypedIOServer | null = null;

const resolveAllowedOrigins = (): string[] | boolean => {
  const raw = corsConfig.origin ?? '';
  const values = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (values.length === 0) return ['http://localhost:4001'];
  if (values.includes('*')) return true;
  return values;
};

const normalizeDeviceId = (value: unknown): string | null => {
  const deviceId = String(value ?? '').trim();
  return deviceId.length > 0 ? deviceId : null;
};

const getDeviceIds = (payload: { deviceId?: unknown; deviceIds?: unknown } | string | string[]): string[] => {
  const values = Array.isArray(payload)
    ? payload
    : typeof payload === 'string'
      ? [payload]
      : Array.isArray(payload?.deviceIds)
        ? payload.deviceIds
        : [payload?.deviceId];

  return Array.from(new Set(values.map(normalizeDeviceId).filter((id): id is string => Boolean(id))))
    .slice(0, MAX_DEVICE_ROOM_JOINS);
};

const canAccessDevice = async (socket: TypedSocket, deviceId: string): Promise<boolean> => {
  const user = socket.data.user;
  if (!user) return false;

  if (GLOBAL_DEVICE_ACCESS_ROLES.has(user.role) || user.deviceAccessMode === 'all') {
    return true;
  }

  const result = await pool.query(
    `SELECT 1
     FROM user_device_access
     WHERE user_id = $1 AND device_id = $2
     LIMIT 1`,
    [user.id, deviceId],
  );
  return (result.rowCount ?? 0) > 0;
};

const canAccessSystemAdmin = (socket: TypedSocket): boolean => {
  const user = socket.data.user;
  return Boolean(user && SYSTEM_ADMIN_ROLES.has(user.role));
};

const canAccessNamespace = (socket: TypedSocket, namespaceKey: NamespaceKey): boolean =>
  namespaceKey !== 'firmware' || canAccessSystemAdmin(socket);

const joinUserRoom = (socket: TypedSocket): void => {
  const userId = socket.data.user?.id;
  if (!userId) return;

  const room = `user:${userId}`;
  socket.join(room);
  socket.data.activeRooms?.add(room);
};

const joinSystemAdminRoom = (socket: TypedSocket): void => {
  if (!canAccessSystemAdmin(socket)) {
    return;
  }

  socket.join(SYSTEM_ADMIN_ROOM);
  socket.data.activeRooms?.add(SYSTEM_ADMIN_ROOM);
};

const joinDeviceRoom = async (socket: TypedSocket, deviceId: string): Promise<void> => {
  if (!(await canAccessDevice(socket, deviceId))) {
    socket.emit('device:join_denied', { deviceId });
    log.warn('Device room join denied', {
      socketId: socket.id,
      userId: socket.data.user?.id,
      deviceId,
    });
    return;
  }

  const room = `device:${deviceId}`;
  socket.join(room);
  socket.data.activeRooms?.add(room);
  log.debug(`${socket.id} joined ${room}`);
};

// ── Device room handlers ─────────────────────────────────────────────

const initializeDeviceRoomHandlers = (socket: TypedSocket): void => {
  socket.on('device:join', (payload: { deviceId?: string; deviceIds?: string[] } | string | string[]) => {
    void Promise.all(getDeviceIds(payload).map((deviceId) => joinDeviceRoom(socket, deviceId)))
      .catch((error) => {
        socket.emit('device:join_error', { message: 'Unable to join device room' });
        log.warn('Device room join failed', {
          socketId: socket.id,
          userId: socket.data.user?.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });
  });

  socket.on('device:leave', (payload: { deviceId?: string; deviceIds?: string[] } | string | string[]) => {
    for (const deviceId of getDeviceIds(payload)) {
      const room = `device:${deviceId}`;
      socket.leave(room);
      socket.data.activeRooms?.delete(room);
      log.debug(`${socket.id} left ${room}`);
    }
  });
};

// ── Namespace handler attachment ─────────────────────────────────────

const attachNamespaceHandlers = (
  server: TypedIOServer,
  namespaceKey: NamespaceKey,
): void => {
  const namespace = server.of(`/${namespaceKey}`);

  namespace.use((socket, next) => {
    void socketAuthMiddleware(socket as TypedSocket, (error) => {
      if (error) {
        next(error);
        return;
      }
      if (!canAccessNamespace(socket as TypedSocket, namespaceKey)) {
        next(new Error('Forbidden namespace'));
        return;
      }
      next();
    });
  });

  namespace.on('connection', (socket) => {
    log.info(`Client connected to /${namespaceKey} (${socket.id})`);
    incrementNamespaceConnection(namespaceKey);

    const typedSocket = socket as TypedSocket;
    joinUserRoom(typedSocket);
    joinSystemAdminRoom(typedSocket);

    if (namespaceKey === 'devices') {
      initializeDeviceRoomHandlers(typedSocket);
    }

    socket.on('disconnect', (reason) => {
      if (typedSocket.data.activeRooms) {
        for (const room of typedSocket.data.activeRooms) {
          socket.leave(room);
        }
        typedSocket.data.activeRooms.clear();
      }

      log.info(`Client disconnected from /${namespaceKey} (${socket.id}) reason=${reason}`);
      decrementNamespaceConnection(namespaceKey);
    });
  });
};

// ── Event bus → Socket.IO bridges ────────────────────────────────────

const emitDeviceEvent = <T extends { deviceId?: string; device_id?: string }>(
  server: TypedIOServer,
  event: string,
  payload: T,
): void => {
  const deviceId = normalizeDeviceId(payload.deviceId ?? payload.device_id);
  if (!deviceId) {
    log.warn('Skipped device realtime event without device id', { event });
    return;
  }

  server.of('/devices').to(`device:${deviceId}`).emit(event, payload);
  recordEventEmission(event);
};

const emitUserEvent = (
  server: TypedIOServer,
  namespace: NamespaceKey,
  event: string,
  payload: { user_id?: number | null },
): void => {
  const ns = server.of(`/${namespace}`);
  if (payload.user_id) {
    ns.to(`user:${payload.user_id}`).emit(event, payload);
  } else {
    ns.emit(event, payload);
  }
  recordEventEmission(event);
};

const getVehicleDeviceId = async (vehicleId: string): Promise<string | null> => {
  const result = await pool.query<{ device_id: string | null }>(
    `SELECT device_id
     FROM vehicles
     WHERE vehicle_id = $1
     LIMIT 1`,
    [vehicleId],
  );
  return normalizeDeviceId(result.rows[0]?.device_id);
};

const resolvePayloadDeviceId = async (payload: {
  deviceId?: unknown;
  device_id?: unknown;
  vehicleId?: unknown;
  vehicle_id?: unknown;
}): Promise<string | null> => {
  const directDeviceId = normalizeDeviceId(payload.deviceId ?? payload.device_id);
  if (directDeviceId) {
    return directDeviceId;
  }

  const vehicleId = normalizeDeviceId(payload.vehicleId ?? payload.vehicle_id);
  return vehicleId ? getVehicleDeviceId(vehicleId) : null;
};

const getDeviceNotificationUserIds = async (deviceId: string): Promise<number[]> => {
  const result = await pool.query<{ id: number }>(
    `SELECT id
     FROM users
     WHERE status = 'active'
       AND (role IN ('root', 'admin') OR device_access_mode = 'all')
     UNION
     SELECT uda.user_id AS id
     FROM user_device_access uda
     JOIN users u ON u.id = uda.user_id
     WHERE u.status = 'active' AND uda.device_id = $1`,
    [deviceId],
  );

  return result.rows.map((row) => Number(row.id)).filter(Number.isFinite);
};

const emitNotificationEvent = async <T extends {
  deviceId?: string | null;
  device_id?: string | null;
  vehicleId?: string | null;
  vehicle_id?: string | null;
}>(
  server: TypedIOServer,
  event: string,
  payload: T,
): Promise<void> => {
  const namespace = server.of('/notifications');
  const deviceId = await resolvePayloadDeviceId(payload);

  if (!deviceId) {
    namespace.to(SYSTEM_ADMIN_ROOM).emit(event, payload);
    recordEventEmission(event);
    return;
  }

  const userIds = await getDeviceNotificationUserIds(deviceId);
  userIds.forEach((userId) => {
    namespace.to(`user:${userId}`).emit(event, payload);
  });
  recordEventEmission(event);
};

const emitDashboardDeviceEvent = async <T extends {
  deviceId?: unknown;
  device_id?: unknown;
  vehicleId?: unknown;
  vehicle_id?: unknown;
}>(
  server: TypedIOServer,
  event: string,
  payload: T,
): Promise<void> => {
  const namespace = server.of('/dashboard');
  const deviceId = await resolvePayloadDeviceId(payload);

  if (!deviceId) {
    namespace.to(SYSTEM_ADMIN_ROOM).emit(event, payload);
    recordEventEmission(event);
    return;
  }

  const userIds = await getDeviceNotificationUserIds(deviceId);
  userIds.forEach((userId) => {
    namespace.to(`user:${userId}`).emit(event, payload);
  });
  recordEventEmission(event);
};

const registerEventBridges = (server: TypedIOServer): void => {
  subscribeEvent('device:status', (payload) => emitDeviceEvent(server, 'device:status', payload));
  subscribeEvent('device:position', (payload) => emitDeviceEvent(server, 'device:position', payload));
  subscribeEvent('device:session_start', (payload) => emitDeviceEvent(server, 'device:session_start', payload));
  subscribeEvent('device:session_end', (payload) => emitDeviceEvent(server, 'device:session_end', payload));

  subscribeEvent('command:ack', (payload) => {
    const deviceId = normalizeDeviceId(payload.device_id);
    if (!deviceId) {
      log.warn('Skipped command ack without device id');
      return;
    }

    server
      .of('/devices')
      .to(`device:${deviceId}`)
      .emit('command:ack', payload);
    recordEventEmission('command:ack');
  });

  subscribeEvent('stats:update', (payload) => {
    void emitDashboardDeviceEvent(server, 'stats:update', payload).catch((error) => {
      log.error('Failed to emit scoped dashboard stats update', { error });
    });
  });

  subscribeEvent('alert:new', (payload) => {
    void emitDashboardDeviceEvent(server, 'alert:new', payload).catch((error) => {
      log.error('Failed to emit scoped dashboard alert', { error });
    });
    void emitNotificationEvent(server, 'alert:new', payload).catch((error) => {
      log.error('Failed to emit scoped alert notification', { error });
    });
  });

  subscribeEvent('alert:updated', (payload) => {
    void emitDashboardDeviceEvent(server, 'alert:updated', payload).catch((error) => {
      log.error('Failed to emit scoped dashboard alert update', { error });
    });
    void emitNotificationEvent(server, 'alert:updated', payload).catch((error) => {
      log.error('Failed to emit scoped alert update notification', { error });
    });
  });

  subscribeEvent('alert:deleted', (payload) => {
    void emitDashboardDeviceEvent(server, 'alert:deleted', payload).catch((error) => {
      log.error('Failed to emit scoped dashboard alert deletion', { error });
    });
    void emitNotificationEvent(server, 'alert:deleted', payload).catch((error) => {
      log.error('Failed to emit scoped alert deletion notification', { error });
    });
  });

  subscribeEvent('violation:new', (payload) => {
    void emitDashboardDeviceEvent(server, 'violation:new', payload).catch((error) => {
      log.error('Failed to emit scoped dashboard violation', { error });
    });
    void emitNotificationEvent(server, 'violation:new', payload).catch((error) => {
      log.error('Failed to emit scoped violation notification', { error });
    });
  });

  subscribeEvent('violation:updated', (payload) => {
    void emitDashboardDeviceEvent(server, 'violation:updated', payload).catch((error) => {
      log.error('Failed to emit scoped dashboard violation update', { error });
    });
    void emitNotificationEvent(server, 'violation:updated', payload).catch((error) => {
      log.error('Failed to emit scoped violation update notification', { error });
    });
  });

  subscribeEvent('notification:new', (payload) => {
    void emitNotificationEvent(server, 'notification:new', payload).catch((error) => {
      log.error('Failed to emit scoped notification', { error });
    });
  });

  subscribeEvent('notification:updated', (payload) => {
    emitUserEvent(server, 'notifications', 'notification:updated', payload);
  });

  subscribeEvent('activity:new', (payload) => {
    void emitDashboardDeviceEvent(server, 'activity:new', payload).catch((error) => {
      log.error('Failed to emit scoped dashboard activity', { error });
    });
  });

  subscribeEvent('zone:updated', (payload) => {
    void emitNotificationEvent(server, 'zone:updated', payload).catch((error) => {
      log.error('Failed to emit scoped zone notification', { error });
    });
    void emitDashboardDeviceEvent(server, 'zone:updated', payload).catch((error) => {
      log.error('Failed to emit scoped dashboard zone update', { error });
    });
  });

  subscribeEvent('zone:state-changed', (payload) => {
    void emitNotificationEvent(server, 'zone:state-changed', payload).catch((error) => {
      log.error('Failed to emit scoped zone state notification', { error });
    });
    void emitDashboardDeviceEvent(server, 'zone:state-changed', payload).catch((error) => {
      log.error('Failed to emit scoped dashboard zone state update', { error });
    });
  });

  subscribeEvent('geofence:enter', (payload) => {
    void emitNotificationEvent(server, 'geofence:enter', payload).catch((error) => {
      log.error('Failed to emit scoped legacy geofence enter notification', { error });
    });
  });

  subscribeEvent('geofence:exit', (payload) => {
    void emitNotificationEvent(server, 'geofence:exit', payload).catch((error) => {
      log.error('Failed to emit scoped legacy geofence exit notification', { error });
    });
  });

  subscribeEvent('export:progress', (payload) => {
    emitUserEvent(server, 'exports', 'export:progress', payload);
  });

  subscribeEvent('export:ready', (payload) => {
    emitUserEvent(server, 'exports', 'export:ready', payload);
  });

  subscribeEvent('firmware:assignment', (payload) => {
    server.of('/firmware').emit('firmware:assignment', payload);
    recordEventEmission('firmware:assignment');
  });

  subscribeEvent('firmware:progress', (payload) => {
    server.of('/firmware').emit('firmware:progress', payload);
    recordEventEmission('firmware:progress');
  });

  subscribeEvent('simulator:status', (payload) => {
    server.of('/dashboard').emit('simulator:status', payload);
    recordEventEmission('simulator:status');
  });

  subscribeEvent('auth:access-revoked', ({ userId }) => {
    const room = `user:${userId}`;
    for (const namespaceKey of WS_NAMESPACES) {
      server.of(`/${namespaceKey}`).in(room).disconnectSockets(true);
    }
    log.info('Disconnected realtime sockets after user access change', { userId });
  });

  subscribeEvent('system-admin:settings', (payload) => {
    server.of('/dashboard').to(SYSTEM_ADMIN_ROOM).emit('system-admin:settings', payload);
    recordEventEmission('system-admin:settings');
  });
};

// ── Public API ───────────────────────────────────────────────────────

export const registerRealtime = (httpServer: HTTPServer): TypedIOServer => {
  if (io) return io;

  const origin = resolveAllowedOrigins();

  const server = new Server(httpServer, {
    cors: { origin, credentials: true },
    path: '/ws',
    transports: ['websocket', 'polling'],
    serveClient: false,
    pingTimeout: 60_000,
    pingInterval: 25_000,
    connectTimeout: 45_000,
  }) as TypedIOServer;

  WS_NAMESPACES.forEach((ns) => attachNamespaceHandlers(server, ns));
  registerEventBridges(server);

  io = server;
  log.info('Realtime gateway initialized on path /ws');
  return server;
};

export const getRealtimeServer = (): TypedIOServer => {
  if (!io) throw new Error('Realtime server not initialized');
  return io;
};

export const closeSocketServer = async (): Promise<void> => {
  if (!io) return;
  log.info('Closing WebSocket server...');
  await io.close();
  io = null;
  log.info('WebSocket server closed');
};
