import type { MqttClient } from 'mqtt';
import { DEVICE_TOPICS } from '../constants/topics';
import { logger } from '../infrastructure/logger';

/**
 * QoS mapping per topic pattern.
 * - rawdata: QoS 0 (high frequency telemetry, losing a few is OK)
 * - status:  QoS 1 (important state transitions)
 * - events:  QoS 1 (errors/warnings must not be lost)
 * - firmware: QoS 1 (OTA progress is critical)
 * - command ack: QoS 1 (operator feedback must not be lost)
 */
const SUBSCRIPTION_QOS: Record<string, 0 | 1> = {
  [DEVICE_TOPICS.RAW_DATA]: 0,
  [DEVICE_TOPICS.STATUS]: 1,
  [DEVICE_TOPICS.EVENTS]: 1,
  [DEVICE_TOPICS.FIRMWARE]: 1,
  [DEVICE_TOPICS.COMMAND_ACK]: 1,
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
        logger.error({ err, event: 'mqtt_subscribe_failed' }, 'MQTT topic subscription failed');
        reject(err);
        return;
      }

      // A successful network SUBACK may still deny individual topics (QoS 128)
      // or downgrade a critical QoS1 subscription. Neither is a ready bridge.
      const acknowledged = new Map((granted ?? []).map((grant) => [grant.topic, grant.qos]));
      for (const [topic, request] of Object.entries(topicMap)) {
        const grantedQos = acknowledged.get(topic);
        if (grantedQos === undefined || grantedQos === 128 || grantedQos < request.qos) {
          const failure = new Error(
            `MQTT subscribe not granted: topic=${topic} requested=${request.qos} granted=${grantedQos ?? 'missing'}`,
          );
          logger.error(
            { topic, requestedQos: request.qos, grantedQos, event: 'mqtt_subscribe_denied' },
            'Required MQTT topic subscription denied or downgraded',
          );
          reject(failure);
          return;
        }
        logger.info(
          { topic, qos: grantedQos, event: 'mqtt_topic_subscribed' },
          'MQTT topic subscribed',
        );
      }

      resolve();
    });
  });
};
