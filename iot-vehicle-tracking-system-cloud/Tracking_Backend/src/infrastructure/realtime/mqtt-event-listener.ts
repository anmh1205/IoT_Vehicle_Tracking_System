import mqtt from 'mqtt';
import { mqttConfig } from '@/config/env';
import { createLogger } from '@/infrastructure/logger';
import { publishEvent } from './event-bus.util';
import { handleIgnitionEvent } from '@/domain/trip/services/trip-auto.service';
import * as alertCrudService from '@/domain/alert/services/alert-crud.service';
import { pool } from '@/infrastructure/database/pool';

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
  event_type: 'status' | 'alert' | 'session' | 'data' | 'geofence' | 'zone' | 'ignition';
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

const toTimestampMs = (value: string): number => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const toOptionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const toOptionalInt = (value: unknown): number | undefined => {
  const parsed = toOptionalNumber(value);
  if (parsed === undefined) {
    return undefined;
  }
  const rounded = Math.floor(parsed);
  return rounded > 0 ? rounded : undefined;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const sanitizeRawPayload = (value: unknown): Record<string, unknown> | null => {
  const rawPayload = asRecord(value);
  if (!rawPayload) {
    return null;
  }

  const { auth_token: _authToken, authToken: _authTokenCamel, ...safePayload } = rawPayload;
  return safePayload;
};

const getDiagnosticsSignal = (payload: Record<string, unknown>, signalKey: string): number | undefined => {
  const diagnostics = asRecord(payload.diagnostics);
  const signals = asRecord(diagnostics?.signals);
  return toOptionalNumber(signals?.[signalKey]);
};

const toAlertSeverity = (value: unknown): 'low' | 'medium' | 'high' | 'critical' => {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'critical') return 'critical';
  if (normalized === 'high') return 'high';
  if (normalized === 'low') return 'low';
  return 'medium';
};

const normalizeAlertType = (
  value: unknown,
): 'speeding' | 'zone_enter' | 'zone_exit' | 'zone_outside_periodic' | 'device_offline' | 'maintenance_due' | null => {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'speeding') return 'speeding';
  if (normalized === 'zone_enter' || normalized === 'geofence_enter') return 'zone_enter';
  if (normalized === 'zone_exit' || normalized === 'geofence_exit') return 'zone_exit';
  if (normalized === 'zone_outside_periodic') return 'zone_outside_periodic';
  if (normalized === 'device_offline') return 'device_offline';
  if (normalized === 'maintenance_due') return 'maintenance_due';

  if (
    normalized.startsWith('obd_') ||
    normalized === 'high_vibration' ||
    normalized.startsWith('device_')
  ) {
    return 'maintenance_due';
  }

  return null;
};

const normalizeAlertSource = (
  value: unknown,
  rawAlertType: string,
  title: string,
  message: string,
): 'device' | 'ecu' => {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'ecu' || normalized === 'obd') {
    return 'ecu';
  }
  if (normalized === 'device') {
    return 'device';
  }

  if (
    rawAlertType.startsWith('obd_') ||
    title.startsWith('OBD:') ||
    /dtc|ecu|mil/i.test(message)
  ) {
    return 'ecu';
  }

  return 'device';
};

const fallbackAlertTitle = (payload: Record<string, unknown>, rawAlertType: string): string => {
  const title = payload.title == null ? '' : String(payload.title).trim();
  if (title.length > 0) {
    return title;
  }
  if (rawAlertType === 'maintenance_due') {
    return 'Maintenance recommendation';
  }
  return rawAlertType;
};

const persistRawDataEventLog = async (
  envelope: InternalEnvelope,
  payload: Record<string, unknown>,
): Promise<void> => {
  const deviceId = String(payload.device_id ?? '').trim();
  if (!deviceId) {
    return;
  }

  const heading = toOptionalNumber(payload.heading ?? payload.course);
  const batteryTop = toOptionalNumber(payload.bt ?? payload.battery_top);
  const temperature = toOptionalNumber(payload.temp ?? payload.temperature)
    ?? getDiagnosticsSignal(payload, 'coolant_c')
    ?? getDiagnosticsSignal(payload, 'intake_air_temp_c');

  const context = {
    lat: toOptionalNumber(payload.lat ?? payload.latitude),
    lon: toOptionalNumber(payload.lon ?? payload.longitude),
    spd: toOptionalNumber(payload.spd ?? payload.speed),
    bb: toOptionalNumber(payload.bb),
    bt: batteryTop,
    batt: batteryTop,
    heading,
    course: heading,
    vib: toOptionalNumber(payload.vib ?? payload.vibration),
    temp: temperature,
    temperature,
    err: toOptionalNumber(payload.err ?? payload.error_code),
    diagnostics: payload.diagnostics ?? null,
    raw_payload: sanitizeRawPayload(payload.raw_payload),
    source: 'mqtt_bridge_rawdata',
  };

  const metadata = {
    message_id: payload.message_id ?? null,
    schema_version: payload.schema_version ?? null,
    seq_no: payload.seq_no ?? null,
    boot_id: payload.boot_id ?? null,
  };

  const sessionId = toOptionalInt(payload.session_id);
  const eventTimestamp = new Date(toTimestampMs(envelope.timestamp)).toISOString();

  await pool.query(
    `INSERT INTO event_logs (
      correlation_id,
      device_id,
      session_id,
      event_type,
      event_code,
      severity,
      context,
      metadata,
      message,
      device_timestamp,
      server_timestamp
    )
    VALUES ($1, $2, $3, 'connection', 'mqtt_bridge_rawdata', 'info', $4::jsonb, $5::jsonb, $6, $7, NOW())`,
    [
      envelope.correlation_id || `bridge-${Date.now()}`,
      deviceId,
      sessionId ?? null,
      JSON.stringify(context),
      JSON.stringify(metadata),
      'MQTT Bridge telemetry forwarded',
      eventTimestamp,
    ],
  );
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
          ignitionState:
            envelopePayload.ignition_state == null ? undefined : String(envelopePayload.ignition_state) as
              | 'ON'
              | 'OFF'
              | 'UNKNOWN',
          motionState:
            envelopePayload.motion_state == null ? undefined : String(envelopePayload.motion_state) as
              | 'MOVING'
              | 'STATIONARY'
              | 'UNKNOWN',
          vehicleState:
            envelopePayload.vehicle_state == null ? undefined : String(envelopePayload.vehicle_state) as
              | 'PARKED_OFF'
              | 'ROLLING_IGN_OFF'
              | 'IDLING_ON'
              | 'MOVING_ON'
              | 'UNKNOWN_STATIONARY'
              | 'UNKNOWN_MOVING'
              | 'UNKNOWN',
          deviceState:
            envelopePayload.device_state == null ? undefined : String(envelopePayload.device_state) as
              | 'BOOTING'
              | 'ACTIVE'
              | 'SLEEP_PREPARE'
              | 'SLEEPING'
              | 'WAKING'
              | 'ALARM'
              | 'OTA'
              | 'FAULT',
          sleepMode:
            envelopePayload.sleep_mode == null ? undefined : String(envelopePayload.sleep_mode) as
              | 'NONE'
              | 'FAKE'
              | 'LIGHT'
              | 'DEEP',
          stateUpdatedAt:
            envelopePayload.state_updated_at == null
              ? undefined
              : String(envelopePayload.state_updated_at),
          last_seen_at: data.timestamp,
          metadata,
        });
        break;

      case 'data':
        {
          const batteryTop = toOptionalNumber(
            envelopePayload.bt ?? envelopePayload.battery_top ?? envelopePayload.batt,
          );
          const deviceBattery = toOptionalNumber(
            envelopePayload.bb ??
              envelopePayload.battery_bot ??
              envelopePayload.deviceBattery ??
              envelopePayload.device_battery,
          );
          const engineTemperature =
            getDiagnosticsSignal(envelopePayload, 'coolant_c') ??
            toOptionalNumber(envelopePayload.temp ?? envelopePayload.temperature);
          const ambientTemperature =
            toOptionalNumber(envelopePayload.temperature ?? envelopePayload.temp) ??
            engineTemperature;
          const rpm =
            getDiagnosticsSignal(envelopePayload, 'rpm') ??
            toOptionalNumber(envelopePayload.rpm);

          publishEvent('device:position', {
          device_id: String(envelopePayload.device_id ?? ''),
          lat: Number(envelopePayload.latitude ?? envelopePayload.lat ?? 0),
          lon: Number(envelopePayload.longitude ?? envelopePayload.lon ?? 0),
          speed: Number(envelopePayload.speed ?? envelopePayload.spd ?? 0),
          heading: Number(envelopePayload.heading ?? envelopePayload.course ?? 0),
          timestamp: toTimestampMs(data.timestamp),
          status:
            envelopePayload.current_status == null
              ? undefined
              : String(envelopePayload.current_status),
          ignitionState:
            envelopePayload.ignition_state == null ? undefined : String(envelopePayload.ignition_state) as
              | 'ON'
              | 'OFF'
              | 'UNKNOWN',
          motionState:
            envelopePayload.motion_state == null ? undefined : String(envelopePayload.motion_state) as
              | 'MOVING'
              | 'STATIONARY'
              | 'UNKNOWN',
          vehicleState:
            envelopePayload.vehicle_state == null ? undefined : String(envelopePayload.vehicle_state) as
              | 'PARKED_OFF'
              | 'ROLLING_IGN_OFF'
              | 'IDLING_ON'
              | 'MOVING_ON'
              | 'UNKNOWN_STATIONARY'
              | 'UNKNOWN_MOVING'
              | 'UNKNOWN',
          deviceState:
            envelopePayload.device_state == null ? undefined : String(envelopePayload.device_state) as
              | 'BOOTING'
              | 'ACTIVE'
              | 'SLEEP_PREPARE'
              | 'SLEEPING'
              | 'WAKING'
              | 'ALARM'
              | 'OTA'
              | 'FAULT',
          sleepMode:
            envelopePayload.sleep_mode == null ? undefined : String(envelopePayload.sleep_mode) as
              | 'NONE'
              | 'FAKE'
              | 'LIGHT'
              | 'DEEP',
          stateUpdatedAt:
            envelopePayload.state_updated_at == null
              ? undefined
              : String(envelopePayload.state_updated_at),
          vehicleId:
            envelopePayload.vehicle_id == null ? null : String(envelopePayload.vehicle_id),
          battery:
            batteryTop == null ? null : Number(batteryTop),
          deviceBattery: deviceBattery == null ? null : Number(deviceBattery),
          vehicleBattery: batteryTop == null ? null : Number(batteryTop),
          temperature: ambientTemperature == null ? null : Number(ambientTemperature),
          engineTemperature: engineTemperature == null ? null : Number(engineTemperature),
          rpm: rpm == null ? null : Number(rpm),
          metadata,
        });
        void persistRawDataEventLog(data, envelopePayload).catch((error) => {
          log.error(
            'Failed to persist rawdata event log from mqtt bridge',
            { error, deviceId: envelopePayload.device_id },
          );
        });
        }
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
        {
          const rawAlertType = String(envelopePayload.alert_type ?? 'unknown');
          const normalizedAlertType = normalizeAlertType(rawAlertType);
          const title = fallbackAlertTitle(envelopePayload, rawAlertType);
          const message =
            envelopePayload.message == null ? '' : String(envelopePayload.message);
          const source = normalizeAlertSource(
            envelopePayload.source,
            rawAlertType,
            title,
            message,
          );
          const severity = toAlertSeverity(envelopePayload.severity);
          const latitude = toOptionalNumber(
            envelopePayload.latitude ??
              (envelopePayload.metadata as Record<string, unknown> | undefined)?.latitude,
          );
          const longitude = toOptionalNumber(
            envelopePayload.longitude ??
              (envelopePayload.metadata as Record<string, unknown> | undefined)?.longitude,
          );
          const speed = toOptionalNumber(
            envelopePayload.speed ??
              (envelopePayload.metadata as Record<string, unknown> | undefined)?.speed,
          );
          const thresholdValue = toOptionalNumber(
            envelopePayload.threshold_value ?? envelopePayload.threshold,
          );
          const actualValue = toOptionalNumber(
            envelopePayload.actual_value ?? envelopePayload.value,
          );
          const geofenceId = toOptionalInt(
            envelopePayload.geofence_id ??
              (envelopePayload.metadata as Record<string, unknown> | undefined)?.geofence_id,
          );

          const alertMetadata = asRecord(envelopePayload.metadata);
          const realtimePayload = {
            id: 0,
            vehicle_id:
              envelopePayload.vehicle_id == null ? undefined : String(envelopePayload.vehicle_id),
            device_id: String(envelopePayload.device_id ?? ''),
            alert_type: normalizedAlertType ?? rawAlertType,
            source,
            severity,
            title,
            message: message || undefined,
            latitude,
            longitude,
            metadata,
            alertMetadata,
          };

          if (normalizedAlertType) {
            void alertCrudService.createAlert({
              vehicleId:
                envelopePayload.vehicle_id == null
                  ? undefined
                  : String(envelopePayload.vehicle_id),
              deviceId:
                envelopePayload.device_id == null
                  ? undefined
                  : String(envelopePayload.device_id),
              geofenceId,
              alertType: normalizedAlertType,
              source,
              severity,
              title,
              message: message || undefined,
              latitude,
              longitude,
              speed,
              thresholdValue,
              actualValue,
            }).catch((error) => {
              log.error(
                'Failed to persist internal alert; fallback to realtime-only event',
                {
                  error,
                  rawAlertType,
                  normalizedAlertType,
                  deviceId: envelopePayload.device_id,
                },
              );
              publishEvent('alert:new', realtimePayload);
            });
          } else {
            publishEvent('alert:new', realtimePayload);
          }
        }
        break;

      case 'geofence':
      case 'zone': {
        const eventName = String(envelopePayload.event_name ?? '');
        if (eventName === 'allowed_zone_state_changed' || eventName === 'state_changed') {
          const zoneId = toOptionalInt(envelopePayload.zone_id ?? envelopePayload.allowed_zone_id);
          const vehicleId = envelopePayload.vehicle_id == null ? '' : String(envelopePayload.vehicle_id);
          if (zoneId && vehicleId) {
            publishEvent('zone:state-changed', {
              device_id:
                envelopePayload.device_id == null ? undefined : String(envelopePayload.device_id),
              vehicle_id: vehicleId,
              zone_id: zoneId,
              previous_membership_state:
                String(envelopePayload.previous_membership_state ?? 'unknown') as
                  | 'unknown'
                  | 'inside'
                  | 'outside'
                  | 'suspect',
              membership_state:
                String(envelopePayload.membership_state ?? 'unknown') as
                  | 'unknown'
                  | 'inside'
                  | 'outside'
                  | 'suspect',
              last_changed_at:
                envelopePayload.last_changed_at == null
                  ? data.timestamp
                  : String(envelopePayload.last_changed_at),
              latitude: toOptionalNumber(envelopePayload.latitude),
              longitude: toOptionalNumber(envelopePayload.longitude),
              metadata,
            });
          }
        }
        break;
      }

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
