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
  const client = getClient();
  if (!client?.connected) {
    logger.warn(
      { eventType, event: 'internal_event_publish_skipped', reason: 'mqtt_not_connected' },
      'Internal event publish skipped',
    );
    return;
  }

  const topic = TOPIC_MAP[eventType];
  const qosKey = `device/${eventType}`;
  const qos = INTERNAL_QOS[qosKey] ?? 0;

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
