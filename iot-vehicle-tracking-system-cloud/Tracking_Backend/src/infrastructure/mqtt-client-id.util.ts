import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

const sanitizeClientIdPart = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
};

export const createMqttClientId = (prefix: string): string => {
  const hostPart = sanitizeClientIdPart(hostname()).slice(0, 24) || 'host';
  const randomPart = randomUUID().replace(/-/g, '').slice(0, 8);

  return `${prefix}-${hostPart}-${process.pid}-${randomPart}`;
};
