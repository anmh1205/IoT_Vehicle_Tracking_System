import { getClient } from '../mqtt/client';
import { INTERNAL_TOPICS, INTERNAL_QOS } from '../constants/topics';
import { logger } from '../infrastructure/logger';
import { generateCorrelationId } from '../utils/correlation.util';

type InternalEventType = 'status' | 'alert' | 'session' | 'data' | 'zone' | 'firmware';

const TOPIC_MAP: Record<InternalEventType, string> = {
  status: INTERNAL_TOPICS.DEVICE_STATUS,
  alert: INTERNAL_TOPICS.DEVICE_ALERT,
  session: INTERNAL_TOPICS.DEVICE_SESSION,
  data: INTERNAL_TOPICS.DEVICE_DATA,
  zone: INTERNAL_TOPICS.DEVICE_ZONE,
  firmware: INTERNAL_TOPICS.DEVICE_FIRMWARE,
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
    logger.warn(`Cannot publish internal event ${eventType}: MQTT not connected`);
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
      logger.error({ err, eventType }, 'Failed to publish internal event');
    }
  });
};
