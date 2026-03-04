export type {
  RealtimeSocketData,
  NamespaceKey,
  TypedSocket,
  TypedIOServer,
} from './types';

export {
  publishEvent,
  subscribeEvent,
  onceEvent,
  removeAllEventListeners,
} from './event-bus.util';
export type { RealtimeEventMap } from './event-bus.util';

export {
  incrementNamespaceConnection,
  decrementNamespaceConnection,
  recordEventEmission,
  getRealtimeHealthSnapshot,
} from './health';
export type { RealtimeHealthSnapshot } from './health';

export { socketAuthMiddleware } from './socket-auth.middleware';

export {
  registerRealtime,
  getRealtimeServer,
  closeSocketServer,
} from './socket-server.util';

export {
  initMqttEventListener,
  closeMqttEventListener,
} from './mqtt-event-listener';
