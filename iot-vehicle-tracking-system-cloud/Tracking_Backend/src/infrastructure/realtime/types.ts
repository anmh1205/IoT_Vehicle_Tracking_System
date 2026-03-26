import type { DefaultEventsMap, Server, Socket } from 'socket.io';
import type { SessionUser } from '@/shared/types/common.types';

export interface RealtimeSocketData {
  user?: SessionUser;
  authToken?: string;
  activeRooms?: Set<string>;
}

export type NamespaceKey =
  | 'dashboard'
  | 'devices'
  | 'notifications'
  | 'exports'
  | 'firmware';

export type TypedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  RealtimeSocketData
>;

export type TypedIOServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  RealtimeSocketData
>;
