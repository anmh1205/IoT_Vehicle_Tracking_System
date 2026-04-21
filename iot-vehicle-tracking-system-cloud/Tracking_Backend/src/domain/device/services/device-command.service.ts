import mqtt from 'mqtt';

import { mqttConfig } from '@/config/env';
import * as deviceCommandRepo from '@/domain/device/repositories/device-command.repository';
import { createLogger } from '@/infrastructure/logger';

const logger = createLogger('device-command-service');

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
  options?: { actorUserId?: number; correlationId?: string },
): Promise<deviceCommandRepo.DeviceCommandRecord> => {
  const command = await deviceCommandRepo.createCommand({
    deviceId,
    command: payload.command,
    params: payload.params ?? {},
    actorUserId: options?.actorUserId,
    correlationId: options?.correlationId,
  });

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

    return (
      (await deviceCommandRepo.updateCommandStatus(command.id, 'sent')) ?? {
        ...command,
        status: 'sent',
      }
    );
  } catch (error) {
    const response = error instanceof Error ? error.message : 'publish_failed';
    await deviceCommandRepo.updateCommandStatus(command.id, 'failed', response);
    throw error;
  }
};

export const listCommands = async (deviceId: string, page = 1, limit = 20) => {
  return deviceCommandRepo.listDeviceCommands(deviceId, page, limit);
};
