import { afterEach, describe, expect, it, vi } from 'vitest';

const transport = vi.hoisted(() => ({
  deliveries: [] as Array<{ namespace: string; room: string | null; event: string }>,
}));

vi.mock('socket.io', () => ({
  Server: class {
    private namespaces = new Map<string, {
      use: (_: unknown) => void;
      on: (_: string, __: unknown) => void;
      emit: (event: string) => void;
      to: (room: string) => { emit: (event: string) => void };
    }>();

    of(name: string) {
      if (!this.namespaces.has(name)) {
        this.namespaces.set(name, {
          use: () => {},
          on: () => {},
          emit: (event) => transport.deliveries.push({ namespace:name, room:null, event }),
          to: (room) => ({
            emit: (event: string) => transport.deliveries.push({ namespace:name, room, event }),
          }),
        });
      }
      return this.namespaces.get(name)!;
    }

    async close() {}
  },
}));

vi.mock('@/config/env', () => ({ corsConfig: { origin: 'https://trusted.test' } }));
vi.mock('@/infrastructure/logger', () => ({
  createLogger: () => ({
    warn: vi.fn(), info: vi.fn(), debug: vi.fn(), error: vi.fn(),
  }),
}));
vi.mock('@/infrastructure/database/pool', () => ({ pool: { query: vi.fn() } }));
vi.mock('@/domain/device/services/device-access.service', () => ({ canAccessDeviceId: vi.fn() }));
vi.mock('./socket-auth.middleware', () => ({ socketAuthMiddleware: vi.fn() }));

import { publishEvent, removeAllEventListeners } from './event-bus.util';
import { closeSocketServer, registerRealtime } from './socket-server.util';

describe('Socket.IO recipient routing', () => {
  afterEach(async () => {
    removeAllEventListeners();
    await closeSocketServer();
    transport.deliveries.length = 0;
  });

  it('never broadcasts recipient-less notification state to all authenticated users', () => {
    registerRealtime({} as never);
    publishEvent('notification:updated', { user_id: 0, action: 'read_all', unreadCount: 0 });
    expect(transport.deliveries).toEqual([]);
    publishEvent('notification:updated', { user_id: 101, action: 'read', id: 9 });
    expect(transport.deliveries).toEqual([
      { namespace:'/notifications', room:'user:101', event:'notification:updated' },
    ]);
  });

  it('keeps simulator status with location preview in administrator room', () => {
    registerRealtime({} as never);
    publishEvent('simulator:status', {
      running: true, paused: false, jobId:'s1', startedBy:101,
      startedAt:'2026-10-15', stoppedAt:null, expiresAt:null, lastTickAt:null,
      intervalSec:1, durationMin:1, ticks:1, sentPoints:1,
      deviceIds:['SIM-1'], reason:null, preview:[{latitude:21, longitude:105}],
    });
    expect(transport.deliveries).toEqual([
      { namespace:'/dashboard', room:'role:system-admin', event:'simulator:status' },
    ]);
  });
});
