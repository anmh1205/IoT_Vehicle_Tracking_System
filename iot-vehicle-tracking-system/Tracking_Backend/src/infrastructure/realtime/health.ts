import { wsConnectionsActive } from '@/infrastructure/metrics/app-metrics';
import type { NamespaceKey } from './types';

const namespaceCounts: Record<string, number> = {};
const eventEmissions: Record<string, number> = {};

export const incrementNamespaceConnection = (namespace: NamespaceKey): void => {
  namespaceCounts[namespace] = (namespaceCounts[namespace] ?? 0) + 1;
  wsConnectionsActive.labels(namespace).inc();
};

export const decrementNamespaceConnection = (namespace: NamespaceKey): void => {
  const current = namespaceCounts[namespace] ?? 0;
  namespaceCounts[namespace] = Math.max(0, current - 1);
  wsConnectionsActive.labels(namespace).dec();
};

export const recordEventEmission = (eventName: string): void => {
  eventEmissions[eventName] = (eventEmissions[eventName] ?? 0) + 1;
};

export interface RealtimeHealthSnapshot {
  connections: Record<string, number>;
  totalConnections: number;
  eventEmissions: Record<string, number>;
}

export const getRealtimeHealthSnapshot = (): RealtimeHealthSnapshot => {
  const totalConnections = Object.values(namespaceCounts).reduce(
    (sum, count) => sum + count,
    0,
  );

  return {
    connections: { ...namespaceCounts },
    totalConnections,
    eventEmissions: { ...eventEmissions },
  };
};
