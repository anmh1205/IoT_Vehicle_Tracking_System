import mqtt from 'mqtt';
import { mqttConfig } from '@/config/env';
import { createLogger } from '@/infrastructure/logger';
import { publishEvent } from './event-bus.util';
import { handleIgnitionEvent } from '@/domain/trip/services/trip-auto.service';

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
  event_type: 'status' | 'alert' | 'session' | 'data' | 'ignition';
  timestamp: string;
  payload: Record<string, unknown>;
}

interface RealtimeMetadata {
  message_id?: string;
  schema_version?: string;
  seq_no?: number;
  boot_id?: string;
}

const extractMetadata = (envelopePayload: Record<string, unknown>): RealtimeMetadata | undefined => {
  const messageId = envelopePayload.message_id == null ? undefined : String(envelopePayload.message_id);
  const schemaVersion = envelopePayload.schema_version == null
    ? undefined
    : String(envelopePayload.schema_version);
  const seqNoRaw = envelopePayload.seq_no == null ? undefined : Number(envelopePayload.seq_no);
  const seqNo = Number.isFinite(seqNoRaw) ? seqNoRaw : undefined;
  const bootId = envelopePayload.boot_id == null ? undefined : String(envelopePayload.boot_id);

  if (
    messageId === undefined &&
    schemaVersion === undefined &&
    seqNo === undefined &&
    bootId === undefined
  ) {
    return undefined;
  }

  return {
    message_id: messageId,
    schema_version: schemaVersion,
    seq_no: seqNo,
    boot_id: bootId,
  };
};

let client: mqtt.MqttClient | null = null;

export const initMqttEventListener = (): void => {
  const protocol = mqttConfig.useTls ? 'mqtts' : 'mqtt';
  const port = mqttConfig.useTls ? mqttConfig.tlsPort : mqttConfig.port;
  const brokerUrl = `${protocol}://${mqttConfig.host}:${port}`;

  client = mqtt.connect(brokerUrl, {
    username: mqttConfig.username,
    password: mqttConfig.password,
    clientId: `backend-listener-${process.pid}`,
    reconnectPeriod: 5000,
    clean: true,
    rejectUnauthorized: mqttConfig.rejectUnauthorized,
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

    const envelopePayload = (data.payload ?? {}) as Record<string, unknown>;
    const metadata = extractMetadata(envelopePayload);

    switch (data.event_type) {
      case 'status':
        publishEvent('device:status', {
          device_id: String(envelopePayload.device_id ?? ''),
          status: String(envelopePayload.current_status ?? 'unknown'),
          last_seen_at: data.timestamp,
          metadata,
        });
        break;

      case 'data':
        publishEvent('device:position', {
          device_id: String(envelopePayload.device_id ?? ''),
          lat: Number(envelopePayload.latitude ?? 0),
          lon: Number(envelopePayload.longitude ?? 0),
          speed: Number(envelopePayload.speed ?? 0),
          heading: Number(envelopePayload.course ?? 0),
          timestamp: Date.now(),
          battery: envelopePayload.battery_top == null ? null : Number(envelopePayload.battery_top),
          metadata,
        });
        break;

      case 'session': {
        const action = String(envelopePayload.action ?? '');
        const sessionId = Number(envelopePayload.session_id ?? 0);
        if (action === 'started') {
          publishEvent('device:session_start', {
            device_id: String(envelopePayload.device_id ?? ''),
            session_id: sessionId,
            metadata,
          });
        } else if (action === 'ended') {
          publishEvent('device:session_end', {
            device_id: String(envelopePayload.device_id ?? ''),
            session_id: sessionId,
            metadata,
          });
        }
        break;
      }

      case 'alert':
        publishEvent('alert:new', {
          id: 0,
          device_id: String(envelopePayload.device_id ?? ''),
          alert_type: String(envelopePayload.alert_type ?? 'unknown'),
          severity: 'warning',
          title: String(envelopePayload.alert_type ?? 'Device Alert'),
          message: envelopePayload.message == null ? undefined : String(envelopePayload.message),
          latitude:
            envelopePayload.latitude == null ? undefined : Number(envelopePayload.latitude),
          longitude:
            envelopePayload.longitude == null ? undefined : Number(envelopePayload.longitude),
          metadata,
        });
        break;

      case 'ignition': {
        const ignitionState = String(envelopePayload.state ?? '');
        const vehicleId = envelopePayload.vehicle_id as string | undefined;
        if (vehicleId && (ignitionState === 'on' || ignitionState === 'off')) {
          void handleIgnitionEvent({
            device_id: String(envelopePayload.device_id ?? ''),
            vehicle_id: vehicleId,
            state: ignitionState,
          });
        }
        break;
      }

      default:
        log.debug(`Unknown internal event type: ${data.event_type} on ${topic}`);
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

  await new Promise<void>((resolve) => {
    client?.end(false, {}, () => resolve());
  });

  client = null;
  log.info('MQTT event listener closed');
};
