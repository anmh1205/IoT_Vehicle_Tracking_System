import { getClient } from '../mqtt/client';
import { INTERNAL_TOPICS, INTERNAL_QOS } from '../constants/topics';
import { logger } from '../infrastructure/logger';
import { generateCorrelationId } from '../utils/correlation.util';

type InternalEventType = 'status' | 'alert' | 'session' | 'data' | 'zone' | 'firmware' | 'command';

const TOPIC_MAP: Record<InternalEventType, string> = {
  status: INTERNAL_TOPICS.DEVICE_STATUS,
  alert: INTERNAL_TOPICS.DEVICE_ALERT,
  session: INTERNAL_TOPICS.DEVICE_SESSION,
  data: INTERNAL_TOPICS.DEVICE_DATA,
  zone: INTERNAL_TOPICS.DEVICE_ZONE,
  firmware: INTERNAL_TOPICS.DEVICE_FIRMWARE,
  command: INTERNAL_TOPICS.DEVICE_COMMAND,
};

/**
 * Publish an internal event to EMQX for Backend consumption.
 * Uses QoS mapping: 1 for critical events, 0 for telemetry data.
 */
export const publishInternalEvent = (
  eventType: InternalEventType,
  payload: Record<string, unknown>,
): void => {
  const topic = TOPIC_MAP[eventType];
  const qosKey = `device/${eventType}`;
  const qos = INTERNAL_QOS[qosKey] ?? 0;
  const client = getClient();

  if (!client) {
    logger.warn(
      { eventType, topic, qos, event: 'internal_event_publish_skipped', reason: 'client_missing' },
      'Internal event publish skipped',
    );
    return;
  }

  if (!client.connected && qos === 0) {
    logger.warn(
      { eventType, topic, qos, event: 'internal_event_publish_skipped', reason: 'qos0_offline_drop' },
      'Internal QoS0 event dropped while MQTT is offline',
    );
    return;
  }

  if (!client.connected) {
    logger.info(
      { eventType, topic, qos, event: 'internal_event_publish_queued', reason: 'mqtt_reconnecting' },
      'Critical internal event queued for MQTT reconnect',
    );
  }

  const envelope = {
    correlation_id: generateCorrelationId(),
    event_type: eventType,
    timestamp: new Date().toISOString(),
    payload,
  };

  client.publish(topic, JSON.stringify(envelope), { qos }, (err) => {
    if (err) {
      logger.error({ err, eventType, topic, qos, event: 'internal_event_publish_failed' }, 'Internal event publish failed');
    }
  });
};
