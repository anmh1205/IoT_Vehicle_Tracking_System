import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { mqttConfig } from '../config/env';
import { logger } from '../infrastructure/logger';

let client: MqttClient | null = null;

const CLIENT_ID = 'mqtt-bridge-production';

/**
 * Connect to EMQX broker with persistent session.
 * Supports both MQTT and MQTTS based on config.
 */
export function connectMqtt(): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    const protocol = mqttConfig.useTls ? 'mqtts' : 'mqtt';
    const port = mqttConfig.useTls ? mqttConfig.tlsPort : mqttConfig.port;
    const brokerUrl = `${protocol}://${mqttConfig.host}:${port}`;

    const options: IClientOptions = {
      clientId: CLIENT_ID,
      clean: false,
      username: mqttConfig.username,
      password: mqttConfig.password,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      keepalive: 60,
    };

    if (mqttConfig.useTls) {
      options.rejectUnauthorized = mqttConfig.rejectUnauthorized;
    }

    logger.info(`Connecting to MQTT broker at ${brokerUrl}...`);
    client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
      logger.info('MQTT connected successfully');
      resolve(client!);
    });

    client.on('reconnect', () => {
      logger.warn('MQTT reconnecting...');
    });

    client.on('error', (err) => {
      logger.error({ err }, 'MQTT connection error');
      if (!client?.connected) {
        reject(err);
      }
    });

    client.on('close', () => {
      logger.warn('MQTT connection closed');
    });

    client.on('offline', () => {
      logger.warn('MQTT client offline');
    });
  });
}

/**
 * Disconnect MQTT client gracefully.
 */
export function disconnectMqtt(): Promise<void> {
  return new Promise((resolve) => {
    if (!client) {
      resolve();
      return;
    }
    client.end(false, {}, () => {
      logger.info('MQTT disconnected');
      client = null;
      resolve();
    });
  });
}

/**
 * Get the current MQTT client instance.
 */
export function getClient(): MqttClient | null {
  return client;
}

/**
 * Publish a message to a device-specific topic.
 */
export function publishToDevice(
  deviceId: string,
  topic: string,
  payload: Record<string, unknown>,
  qos: 0 | 1 | 2 = 1,
): void {
  if (!client?.connected) {
    logger.warn(`Cannot publish to ${topic}: MQTT not connected`);
    return;
  }

  const fullTopic = `v1/${deviceId}/${topic}`;
  client.publish(fullTopic, JSON.stringify(payload), { qos }, (err) => {
    if (err) {
      logger.error({ err, topic: fullTopic }, 'Failed to publish to device');
    }
  });
}
