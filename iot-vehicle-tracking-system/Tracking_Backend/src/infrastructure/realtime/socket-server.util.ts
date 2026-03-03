import type { Server as HTTPServer } from 'http';
import { Server } from 'socket.io';

import { createLogger } from '@/infrastructure/logger';
import { corsConfig } from '@/config/env';
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

let io: TypedIOServer | null = null;

const resolveAllowedOrigins = (): string[] | boolean => {
  const raw = corsConfig.origin ?? '';
  const values = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (values.length === 0) return ['http://localhost:4002'];
  if (values.includes('*')) return true;
  return values;
};

// ── Device room handlers ─────────────────────────────────────────────

const initializeDeviceRoomHandlers = (socket: TypedSocket): void => {
  socket.on('device:join', (payload: { deviceId?: string } | string) => {
    const deviceId = typeof payload === 'string' ? payload : payload?.deviceId;
    if (!deviceId) return;

    const room = `device:${deviceId.trim()}`;
    socket.join(room);
    socket.data.activeRooms?.add(room);
    log.debug(`${socket.id} joined ${room}`);
  });

  socket.on('device:leave', (payload: { deviceId?: string } | string) => {
    const deviceId = typeof payload === 'string' ? payload : payload?.deviceId;
    if (!deviceId) return;

    const room = `device:${deviceId.trim()}`;
    socket.leave(room);
    socket.data.activeRooms?.delete(room);
    log.debug(`${socket.id} left ${room}`);
  });
};

// ── Namespace handler attachment ─────────────────────────────────────

const attachNamespaceHandlers = (
  server: TypedIOServer,
  namespaceKey: NamespaceKey,
): void => {
  const namespace = server.of(`/${namespaceKey}`);

  // All namespaces require authentication
  namespace.use(socketAuthMiddleware);

  namespace.on('connection', (socket) => {
    log.info(`Client connected to /${namespaceKey} (${socket.id})`);
    incrementNamespaceConnection(namespaceKey);

    const typedSocket = socket as TypedSocket;

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

const registerEventBridges = (server: TypedIOServer): void => {
  // Device events → /devices namespace
  subscribeEvent('device.status.changed', (payload) => {
    server.of('/devices').emit('device:status', payload);
    recordEventEmission('device.status.changed');
  });

  subscribeEvent('device.position.updated', (payload) => {
    server.of('/devices').emit('device:position', payload);
    recordEventEmission('device.position.updated');
  });

  subscribeEvent('device.session.started', (payload) => {
    server.of('/devices').emit('device:session_start', payload);
    recordEventEmission('device.session.started');
  });

  subscribeEvent('device.session.ended', (payload) => {
    server.of('/devices').emit('device:session_end', payload);
    recordEventEmission('device.session.ended');
  });

  subscribeEvent('command.acknowledged', (payload) => {
    server
      .of('/devices')
      .to(`device:${payload.device_id}`)
      .emit('command:ack', payload);
    recordEventEmission('command.acknowledged');
  });

  // Dashboard events → /dashboard namespace
  subscribeEvent('dashboard.stats.updated', (payload) => {
    server.of('/dashboard').emit('stats:update', payload);
    recordEventEmission('dashboard.stats.updated');
  });

  subscribeEvent('dashboard.alert.created', (payload) => {
    server.of('/dashboard').emit('alert:new', payload);
    server.of('/notifications').emit('alert:new', payload);
    recordEventEmission('dashboard.alert.created');
  });

  subscribeEvent('dashboard.activity.created', (payload) => {
    server.of('/dashboard').emit('activity:new', payload);
    recordEventEmission('dashboard.activity.created');
  });

  // Geofence events → /notifications namespace
  subscribeEvent('geofence.entered', (payload) => {
    server.of('/notifications').emit('geofence:enter', payload);
    recordEventEmission('geofence.entered');
  });

  subscribeEvent('geofence.exited', (payload) => {
    server.of('/notifications').emit('geofence:exit', payload);
    recordEventEmission('geofence.exited');
  });

  // Export events → /exports namespace
  subscribeEvent('export.completed', (payload) => {
    server.of('/exports').emit('export:ready', payload);
    recordEventEmission('export.completed');
  });

  // Firmware events → /firmware namespace
  subscribeEvent('firmware.assignment.updated', (payload) => {
    server.of('/firmware').emit('firmware:assignment', payload);
    recordEventEmission('firmware.assignment.updated');
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
