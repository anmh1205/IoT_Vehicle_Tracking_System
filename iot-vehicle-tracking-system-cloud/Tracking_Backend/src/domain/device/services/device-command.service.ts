import mqtt from 'mqtt';

import { mqttConfig } from '@/config/env';
import { createLogger } from '@/infrastructure/logger';

type DeviceCommandStatus = 'pending' | 'sent' | 'acknowledged' | 'failed';

export interface DeviceCommandRecord {
  id: number;
  deviceId: string;
  command: string;
  params: Record<string, unknown>;
  status: DeviceCommandStatus;
  sentAt: string;
  ackedAt: string | null;
  response: string | null;
}

const logger = createLogger('device-command-service');

const commandStore = new Map<string, DeviceCommandRecord[]>();
let commandIdCounter = 1;

let mqttClient: mqtt.MqttClient | null = null;

const getMqttClient = (): mqtt.MqttClient => {
  if (mqttClient) {
    return mqttClient;
  }

  const protocol = mqttConfig.useTls ? 'mqtts' : 'mqtt';
  const port = mqttConfig.useTls ? mqttConfig.tlsPort : mqttConfig.port;
  const brokerUrl = `${protocol}://${mqttConfig.host}:${port}`;

  mqttClient = mqtt.connect(brokerUrl, {
    username: mqttConfig.username,
    password: mqttConfig.password,
    clientId: `backend-device-command-${process.pid}`,
    reconnectPeriod: 5000,
    clean: true,
    rejectUnauthorized: mqttConfig.rejectUnauthorized,
  });

  mqttClient.on('connect', () => {
    logger.info(`Connected to MQTT broker for device commands at ${brokerUrl}`);
  });

  mqttClient.on('error', (err) => {
    logger.error(`MQTT device command client error: ${err.message}`);
  });

  mqttClient.on('close', () => {
    logger.warn('MQTT device command client disconnected, reconnecting...');
  });

  return mqttClient;
};

export const sendCommand = async (
  deviceId: string,
  payload: { command: string; params?: Record<string, unknown> },
): Promise<DeviceCommandRecord> => {
  const command: DeviceCommandRecord = {
    id: commandIdCounter++,
    deviceId,
    command: payload.command,
    params: payload.params ?? {},
    status: 'pending',
    sentAt: new Date().toISOString(),
    ackedAt: null,
    response: null,
  };

  const current = commandStore.get(deviceId) ?? [];
  commandStore.set(deviceId, [command, ...current].slice(0, 500));

  const topic = `v1/${deviceId}/commands`;
  const message = JSON.stringify({
    command: payload.command,
    params: payload.params ?? {},
  });

  const client = getMqttClient();

  try {
    await new Promise<void>((resolve, reject) => {
      client.publish(topic, message, { qos: 1, retain: false }, (err?: Error) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    command.status = 'sent';
    return command;
  } catch (error) {
    command.status = 'failed';
    command.response = error instanceof Error ? error.message : 'publish_failed';
    throw error;
  }
};

export const listCommands = async (deviceId: string, page = 1, limit = 20) => {
  const rows = commandStore.get(deviceId) ?? [];
  const offset = (page - 1) * limit;
  const items = rows.slice(offset, offset + limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total: rows.length,
      totalPages: Math.max(Math.ceil(rows.length / limit), 1),
    },
  };
};
