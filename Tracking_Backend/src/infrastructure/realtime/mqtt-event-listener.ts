import mqtt from 'mqtt';
import { mqttConfig } from '@/config/env';
import { createLogger } from '@/infrastructure/logger';
import { publishEvent } from './event-bus.util';

const log = createLogger('mqtt-listener');

/**
 * MQTT Event Listener — bridges internal events from Tracking_MqttBridge
 * into the in-process Event Bus so Socket.IO can broadcast to frontends.
 *
 * Flow: MQTT Bridge → EMQX (internal/events/#) → this listener → Event Bus → Socket.IO
 *
 * Topic map (published by MqttBridge/publishers/internal-event.publisher.ts):
 *   internal/events/device/status   QoS 1  — device online/offline transitions
 *   internal/events/device/alert    QoS 1  — vibration alerts, device errors
 *   internal/events/device/session  QoS 1  — session started/ended
 *   internal/events/device/data     QoS 0  — telemetry position updates
 */

interface InternalEnvelope {
  correlation_id: string;
  event_type: 'status' | 'alert' | 'session' | 'data';
  timestamp: string;
  device_id: string;
  [key: string]: unknown;
}

let client: mqtt.MqttClient | null = null;

export const initMqttEventListener = (): void => {
  const brokerUrl = `mqtt://${mqttConfig.host}:${mqttConfig.port}`;

  client = mqtt.connect(brokerUrl, {
    username: mqttConfig.username,
    password: mqttConfig.password,
    clientId: `backend-listener-${process.pid}`,
    reconnectPeriod: 5000,
    clean: true,
  });

  client.on('connect', () => {
    log.info(`Connected to EMQX at ${brokerUrl} for internal events`);
    client!.subscribe('internal/events/#', { qos: 1 }, (err) => {
      if (err) {
        log.error(`Failed to subscribe to internal/events/#: ${err.message}`);
      } else {
        log.info('Subscribed to internal/events/#');
      }
    });
  });

  client.on('message', (topic: string, payload: Buffer) => {
    let data: InternalEnvelope;
    try {
      data = JSON.parse(payload.toString()) as InternalEnvelope;
    } catch {
      log.warn(`Malformed JSON on ${topic}`);
      return;
    }

    // Extract event type from topic: internal/events/device/{type}
    const segments = topic.split('/');
    const eventType = segments[segments.length - 1]; // status | alert | session | data

    switch (eventType) {
      case 'status':
        publishEvent('device.status.changed', {
          device_id: data.device_id,
          status: (data.current_status as string) ?? 'unknown',
          last_seen_at: data.timestamp,
        });
        break;

      case 'data':
        publishEvent('device.position.updated', {
          device_id: data.device_id,
          lat: (data.latitude as number) ?? 0,
          lon: (data.longitude as number) ?? 0,
          speed: (data.speed as number) ?? 0,
          heading: (data.course as number) ?? 0,
          timestamp: Date.now(),
          battery: (data.battery_top as number) ?? null,
        });
        break;

      case 'session': {
        const action = data.action as string;
        const sessionId = (data.session_id as number) ?? 0;
        if (action === 'started') {
          publishEvent('device.session.started', {
            device_id: data.device_id,
            session_id: sessionId,
          });
        } else if (action === 'ended') {
          publishEvent('device.session.ended', {
            device_id: data.device_id,
            session_id: sessionId,
          });
        }
        break;
      }

      case 'alert':
        publishEvent('dashboard.alert.created', {
          id: 0, // Bridge alerts don't have a DB id yet
          device_id: data.device_id,
          alert_type: (data.alert_type as string) ?? 'unknown',
          severity: 'warning',
          title: (data.alert_type as string) ?? 'Device Alert',
          message: (data.message as string) ?? undefined,
          latitude: (data.latitude as number) ?? undefined,
          longitude: (data.longitude as number) ?? undefined,
        });
        break;

      default:
        log.debug(`Unknown internal event type: ${eventType} on ${topic}`);
    }
  });

  client.on('error', (err) => {
    log.error(`MQTT event listener error: ${err.message}`);
  });

  client.on('close', () => {
    log.warn('MQTT event listener disconnected, will reconnect...');
  });
};

export const closeMqttEventListener = async (): Promise<void> => {
  if (!client) return;
  log.info('Closing MQTT event listener...');
  await client.endAsync();
  client = null;
  log.info('MQTT event listener closed');
};
