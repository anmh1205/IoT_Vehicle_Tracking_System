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

const buildInternalEnvelope = (
  eventType: InternalEventType,
  payload: Record<string, unknown>,
) => ({
  correlation_id: generateCorrelationId(),
  event_type: eventType,
  timestamp: new Date().toISOString(),
  payload,
});

/**
 * Publish an internal event and resolve only after MQTT.js reports transport
 * acceptance. Critical device-ingress handlers await this promise before they
 * allow their source QoS1 packet to be PUBACKed.
 */
export const publishInternalEventDurable = (
  eventType: InternalEventType,
  payload: Record<string, unknown>,
): Promise<void> => {
  const topic = TOPIC_MAP[eventType];
  const qosKey = `device/${eventType}`;
  const qos = INTERNAL_QOS[qosKey] ?? 0;
  const client = getClient();

  if (!client) {
    return Promise.reject(new Error(`MQTT client unavailable for internal ${eventType} event`));
  }

  if (!client.connected && qos === 0) {
    return Promise.reject(new Error(`MQTT offline; QoS0 internal ${eventType} event cannot be queued`));
  }

  if (!client.connected) {
    logger.info(
      { eventType, topic, qos, event: 'internal_event_publish_queued', reason: 'mqtt_reconnecting' },
      'Critical internal event queued for MQTT reconnect',
    );
  }

  const envelope = buildInternalEnvelope(eventType, payload);

  return new Promise<void>((resolve, reject) => {
    client.publish(topic, JSON.stringify(envelope), { qos }, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
};

/**
 * Fire-and-forget compatibility wrapper used by best-effort paths such as
 * QoS0 telemetry. Critical QoS1 ingress paths must call
 * publishInternalEventDurable() directly and await it.
 */
export const publishInternalEvent = (
  eventType: InternalEventType,
  payload: Record<string, unknown>,
): void => {
  void publishInternalEventDurable(eventType, payload).catch((err) => {
    const topic = TOPIC_MAP[eventType];
    const qosKey = `device/${eventType}`;
    const qos = INTERNAL_QOS[qosKey] ?? 0;
    logger.error(
      { err, eventType, topic, qos, event: 'internal_event_publish_failed' },
      'Internal event publish failed',
    );
  });
};
