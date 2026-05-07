import fs from 'node:fs';
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { mqttConfig } from '../config/env';
import { logger } from '../infrastructure/logger';

let client: MqttClient | null = null;

const CLIENT_ID = 'mqtt-bridge-production';

/**
 * Connect to EMQX broker with persistent session.
 * Supports both MQTT and MQTTS based on config.
 */
export const connectMqtt = (): Promise<MqttClient> => {
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
      options.servername = mqttConfig.servername;

      if (mqttConfig.caCertPath) {
        try {
          options.ca = fs.readFileSync(mqttConfig.caCertPath);
        } catch (err) {
          logger.error(
            { err, caCertPath: mqttConfig.caCertPath, event: 'mqtt_ca_cert_load_failed' },
            'MQTT CA certificate load failed',
          );
          reject(err as Error);
          return;
        }
      }
    }

    logger.info({ brokerUrl, clientId: CLIENT_ID, event: 'mqtt_connecting' }, 'MQTT connection starting');
    client = mqtt.connect(brokerUrl, options);

    client.on('connect', () => {
      logger.info({ brokerUrl, clientId: CLIENT_ID, event: 'mqtt_connected' }, 'MQTT connected');
      resolve(client!);
    });

    client.on('reconnect', () => {
      logger.warn({ brokerUrl, clientId: CLIENT_ID, event: 'mqtt_reconnecting' }, 'MQTT reconnecting');
    });

    client.on('error', (err) => {
      logger.error({ err, brokerUrl, clientId: CLIENT_ID, event: 'mqtt_connection_error' }, 'MQTT connection error');
      if (!client?.connected) {
        reject(err);
      }
    });

    client.on('close', () => {
      logger.warn({ brokerUrl, clientId: CLIENT_ID, event: 'mqtt_connection_closed' }, 'MQTT connection closed');
    });

    client.on('offline', () => {
      logger.warn({ brokerUrl, clientId: CLIENT_ID, event: 'mqtt_client_offline' }, 'MQTT client offline');
    });
  });
};

/**
 * Disconnect MQTT client gracefully.
 */
export const disconnectMqtt = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!client) {
      resolve();
      return;
    }
    client.end(false, {}, () => {
      logger.info({ clientId: CLIENT_ID, event: 'mqtt_disconnected' }, 'MQTT disconnected');
      client = null;
      resolve();
    });
  });
};

/**
 * Get the current MQTT client instance.
 */
export const getClient = (): MqttClient | null => {
  return client;
};

/**
 * Publish a message to a device-specific topic.
 */
export const publishToDevice = (
  deviceId: string,
  topic: string,
  payload: Record<string, unknown>,
  qos: 0 | 1 | 2 = 1,
): void => {
  if (!client?.connected) {
    logger.warn({ deviceId, topic, qos, event: 'device_publish_skipped', reason: 'mqtt_not_connected' }, 'Device publish skipped');
    return;
  }

  const fullTopic = `v1/${deviceId}/${topic}`;
  client.publish(fullTopic, JSON.stringify(payload), { qos }, (err) => {
    if (err) {
      logger.error({ err, deviceId, topic: fullTopic, qos, event: 'device_publish_failed' }, 'Device publish failed');
    }
  });
};
