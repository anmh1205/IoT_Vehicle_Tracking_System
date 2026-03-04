import type { MqttClient } from 'mqtt';
import { DEVICE_TOPICS } from '../constants/topics';
import { logger } from '../infrastructure/logger';

/**
 * QoS mapping per topic pattern.
 * - rawdata: QoS 0 (high frequency telemetry, losing a few is OK)
 * - status:  QoS 1 (important state transitions)
 * - events:  QoS 1 (errors/warnings must not be lost)
 * - firmware: QoS 1 (OTA progress is critical)
 */
const SUBSCRIPTION_QOS: Record<string, 0 | 1> = {
  [DEVICE_TOPICS.RAW_DATA]: 0,
  [DEVICE_TOPICS.STATUS]: 1,
  [DEVICE_TOPICS.EVENTS]: 1,
  [DEVICE_TOPICS.FIRMWARE]: 1,
};

/**
 * Subscribe to all device topics on the MQTT client.
 * Returns a promise that resolves when all subscriptions are confirmed.
 */
export const subscribeToDeviceTopics = (client: MqttClient): Promise<void> => {
  const topicMap: Record<string, { qos: 0 | 1 }> = {};

  for (const topic of Object.values(DEVICE_TOPICS)) {
    topicMap[topic] = { qos: SUBSCRIPTION_QOS[topic] ?? 1 };
  }

  return new Promise((resolve, reject) => {
    client.subscribe(topicMap, (err, granted) => {
      if (err) {
        logger.error({ err }, 'Failed to subscribe to device topics');
        reject(err);
        return;
      }

      if (granted) {
        for (const g of granted) {
          logger.info({ topic: g.topic, qos: g.qos }, 'Subscribed to topic');
        }
      }

      resolve();
    });
  });
};
