import client from 'prom-client';

export const registry = new client.Registry();

registry.setDefaultLabels({ app: 'tracking-backend' });

client.collectDefaultMetrics({ register: registry });

export { client };
