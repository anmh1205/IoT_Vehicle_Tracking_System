import { findMany } from '@/infrastructure/database/queries';
import {
  eventLogPositionExistsSql,
  eventLogPositionValueSql,
} from '@/shared/utils/event-log-telemetry-sql.util';

interface TelemetryRow {
  telemetry_timestamp: Date;
  value: string | null;
}

interface SessionTelemetryRow {
  telemetry_timestamp: Date;
  latitude: string | null;
  longitude: string | null;
  speed: string | null;
  device_battery: string | null;
  vehicle_battery: string | null;
  temperature: string | null;
  engine_temperature: string | null;
  error_code: string | null;
  imu_accel_delta_mps2: string | null;
}

const DEFAULT_METRIC = 'imuAccelDeltaMps2';
const TELEMETRY_TIMESTAMP_SQL = 'COALESCE(device_timestamp, server_timestamp)';
const SESSION_TELEMETRY_TIMESTAMP_SQL = 'COALESCE(e.device_timestamp, e.server_timestamp)';
const SESSION_CLOSE_TIMESTAMP_SQL = 'COALESCE(s.session_end, s.server_session_end)';
const SESSION_LATITUDE_SQL = eventLogPositionValueSql('latitude', 'e');
const SESSION_LONGITUDE_SQL = eventLogPositionValueSql('longitude', 'e');
const SESSION_LOCAL_KEY_SQL = "e.context#>>'{raw_payload,local_session_key}'";
const SESSION_BOOT_ID_SQL =
  "COALESCE(e.context#>>'{raw_payload,boot_id}', e.context#>>'{raw_payload,metadata,boot_id}')";
const METRIC_ALIASES: Record<string, string> = {
  imuacceldeltamps2: 'imuAccelDeltaMps2',
  vibration: 'imuAccelDeltaMps2',
  speed: 'speed',
  vehiclebattery: 'vehicleBattery',
  devicebattery: 'deviceBattery',
  temperature: 'temperature',
  enginetemperature: 'engineTemperature',
  latitude: 'latitude',
  longitude: 'longitude',
  errorcode: 'errorCode',
  rpm: 'rpm',
  obdspeed: 'obdSpeedKph',
  obdspeedkph: 'obdSpeedKph',
  coolantc: 'obdCoolantC',
  obdcoolantc: 'obdCoolantC',
};

const METRIC_SQL: Record<string, { value: string; exists: string }> = {
  imuAccelDeltaMps2: {
    value:
      "COALESCE(context#>>'{raw_payload,data,imu_accel_delta_mps2}', context->>'imu_accel_delta_mps2', metadata->>'imu_accel_delta_mps2', context->>'vibration', metadata->>'vibration')",
    exists:
      "((context#>>'{raw_payload,data,imu_accel_delta_mps2}') IS NOT NULL OR context ? 'imu_accel_delta_mps2' OR metadata ? 'imu_accel_delta_mps2' OR context ? 'vibration' OR metadata ? 'vibration')",
  },
  speed: {
    value: eventLogPositionValueSql('speed'),
    exists: eventLogPositionExistsSql('speed'),
  },
  vehicleBattery: {
    value:
      "COALESCE(context#>>'{raw_payload,data,vehicle_battery}', context->>'vehicle_battery', metadata->>'vehicle_battery')",
    exists:
      "((context#>>'{raw_payload,data,vehicle_battery}') IS NOT NULL OR context ? 'vehicle_battery' OR metadata ? 'vehicle_battery')",
  },
  deviceBattery: {
    value:
      "COALESCE(context#>>'{raw_payload,data,device_battery}', context->>'device_battery', metadata->>'device_battery')",
    exists:
      "((context#>>'{raw_payload,data,device_battery}') IS NOT NULL OR context ? 'device_battery' OR metadata ? 'device_battery')",
  },
  temperature: {
    value:
      "COALESCE(context->>'temperature', metadata->>'temperature', context#>>'{raw_payload,diagnostics,signals,coolant_c}', context#>>'{diagnostics,signals,coolant_c}', context#>>'{raw_payload,diagnostics,signals,intake_air_temp_c}', context#>>'{diagnostics,signals,intake_air_temp_c}', metadata#>>'{raw_payload,diagnostics,signals,coolant_c}', metadata#>>'{diagnostics,signals,coolant_c}', metadata#>>'{raw_payload,diagnostics,signals,intake_air_temp_c}', metadata#>>'{diagnostics,signals,intake_air_temp_c}')",
    exists:
      "(context ? 'temperature' OR metadata ? 'temperature' OR (context#>>'{raw_payload,diagnostics,signals,coolant_c}') IS NOT NULL OR (context#>>'{diagnostics,signals,coolant_c}') IS NOT NULL OR (context#>>'{raw_payload,diagnostics,signals,intake_air_temp_c}') IS NOT NULL OR (context#>>'{diagnostics,signals,intake_air_temp_c}') IS NOT NULL OR (metadata#>>'{raw_payload,diagnostics,signals,coolant_c}') IS NOT NULL OR (metadata#>>'{diagnostics,signals,coolant_c}') IS NOT NULL OR (metadata#>>'{raw_payload,diagnostics,signals,intake_air_temp_c}') IS NOT NULL OR (metadata#>>'{diagnostics,signals,intake_air_temp_c}') IS NOT NULL)",
  },
  engineTemperature: {
    value:
      "COALESCE(context#>>'{raw_payload,diagnostics,signals,coolant_c}', context#>>'{diagnostics,signals,coolant_c}', context->>'temperature', metadata#>>'{raw_payload,diagnostics,signals,coolant_c}', metadata#>>'{diagnostics,signals,coolant_c}', metadata->>'temperature')",
    exists:
      "((context#>>'{raw_payload,diagnostics,signals,coolant_c}') IS NOT NULL OR (context#>>'{diagnostics,signals,coolant_c}') IS NOT NULL OR context ? 'temperature' OR (metadata#>>'{raw_payload,diagnostics,signals,coolant_c}') IS NOT NULL OR (metadata#>>'{diagnostics,signals,coolant_c}') IS NOT NULL OR metadata ? 'temperature')",
  },
  latitude: {
    value: eventLogPositionValueSql('latitude'),
    exists: eventLogPositionExistsSql('latitude'),
  },
  longitude: {
    value: eventLogPositionValueSql('longitude'),
    exists: eventLogPositionExistsSql('longitude'),
  },
  errorCode: {
    value:
      "COALESCE(context#>>'{raw_payload,data,error_code}', context->>'error_code', metadata->>'error_code', NULLIF(error_code::text, ''))",
    exists:
      "((context#>>'{raw_payload,data,error_code}') IS NOT NULL OR context ? 'error_code' OR metadata ? 'error_code' OR error_code IS NOT NULL)",
  },
  rpm: {
    value:
      "COALESCE(context#>>'{raw_payload,diagnostics,signals,rpm}', context#>>'{diagnostics,signals,rpm}', context->>'rpm', metadata#>>'{raw_payload,diagnostics,signals,rpm}', metadata#>>'{diagnostics,signals,rpm}', metadata->>'rpm')",
    exists:
      "((context#>>'{raw_payload,diagnostics,signals,rpm}') IS NOT NULL OR (context#>>'{diagnostics,signals,rpm}') IS NOT NULL OR context ? 'rpm' OR (metadata#>>'{raw_payload,diagnostics,signals,rpm}') IS NOT NULL OR (metadata#>>'{diagnostics,signals,rpm}') IS NOT NULL OR metadata ? 'rpm')",
  },
  obdSpeedKph: {
    value:
      "COALESCE(context#>>'{raw_payload,diagnostics,signals,obd_speed_kph}', context#>>'{diagnostics,signals,obd_speed_kph}', context->>'obd_speed_kph', metadata#>>'{raw_payload,diagnostics,signals,obd_speed_kph}', metadata#>>'{diagnostics,signals,obd_speed_kph}', metadata->>'obd_speed_kph')",
    exists:
      "((context#>>'{raw_payload,diagnostics,signals,obd_speed_kph}') IS NOT NULL OR (context#>>'{diagnostics,signals,obd_speed_kph}') IS NOT NULL OR context ? 'obd_speed_kph' OR (metadata#>>'{raw_payload,diagnostics,signals,obd_speed_kph}') IS NOT NULL OR (metadata#>>'{diagnostics,signals,obd_speed_kph}') IS NOT NULL OR metadata ? 'obd_speed_kph')",
  },
  obdCoolantC: {
    value:
      "COALESCE(context#>>'{raw_payload,diagnostics,signals,coolant_c}', context#>>'{diagnostics,signals,coolant_c}', metadata#>>'{raw_payload,diagnostics,signals,coolant_c}', metadata#>>'{diagnostics,signals,coolant_c}')",
    exists:
      "((context#>>'{raw_payload,diagnostics,signals,coolant_c}') IS NOT NULL OR (context#>>'{diagnostics,signals,coolant_c}') IS NOT NULL OR (metadata#>>'{raw_payload,diagnostics,signals,coolant_c}') IS NOT NULL OR (metadata#>>'{diagnostics,signals,coolant_c}') IS NOT NULL)",
  },
};

const resolveMetricKey = (metric: string | undefined): string => {
  const normalizedMetric = String(metric ?? '').trim().toLowerCase();
  return METRIC_ALIASES[normalizedMetric] ?? DEFAULT_METRIC;
};

const parseNullableNumber = (value: string | null): number | null => {
  if (value === null || value.trim() === '') {
    return null;
  }

  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const getTelemetry = async (
  deviceId: string,
  params: { metric: string; from?: string; to?: string },
) => {
  const normalizedMetric = String(params.metric ?? '').trim().toLowerCase();
  const metric = resolveMetricKey(params.metric);
  const from = params.from ? new Date(params.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = params.to ? new Date(params.to) : new Date();
  const sql = METRIC_SQL[metric] ?? METRIC_SQL[DEFAULT_METRIC];

  const rows = await findMany<TelemetryRow>(
    `SELECT telemetry_timestamp, value
     FROM (
       SELECT ${TELEMETRY_TIMESTAMP_SQL} AS telemetry_timestamp, ${sql.value} AS value
       FROM event_logs
       WHERE device_id = $1
         AND ${TELEMETRY_TIMESTAMP_SQL} BETWEEN $2 AND $3
         AND ${sql.exists}
       ORDER BY telemetry_timestamp DESC, server_timestamp DESC
       LIMIT 5000
     ) recent_points
     ORDER BY telemetry_timestamp ASC`,
    [deviceId, from.toISOString(), to.toISOString()],
  );

  return {
    metric: METRIC_ALIASES[normalizedMetric] ?? DEFAULT_METRIC,
    data: rows.flatMap((row) => {
      if (row.value === null || row.value.trim() === '') {
        return [];
      }

      const value = Number.parseFloat(row.value);
      if (!Number.isFinite(value)) {
        return [];
      }

      return [{
        timestamp: row.telemetry_timestamp.toISOString(),
        value,
      }];
    }),
  };
};

export const getSessionTelemetry = async (deviceId: string, sessionId: number) => {
  const rows = await findMany<SessionTelemetryRow>(
    `WITH target_session AS (
       SELECT *
       FROM device_sessions
       WHERE id = $2 AND device_id = $1
       LIMIT 1
     )
     SELECT
       ${SESSION_TELEMETRY_TIMESTAMP_SQL} AS telemetry_timestamp,
       ${SESSION_LATITUDE_SQL} AS latitude,
       ${SESSION_LONGITUDE_SQL} AS longitude,
       ${eventLogPositionValueSql('speed', 'e')} AS speed,
       COALESCE(e.context#>>'{raw_payload,data,device_battery}', e.context->>'device_battery', e.metadata->>'device_battery') AS device_battery,
       COALESCE(e.context#>>'{raw_payload,data,vehicle_battery}', e.context->>'vehicle_battery', e.metadata->>'vehicle_battery') AS vehicle_battery,
       COALESCE(e.context->>'temperature', e.metadata->>'temperature', e.context#>>'{raw_payload,diagnostics,signals,coolant_c}', e.context#>>'{diagnostics,signals,coolant_c}') AS temperature,
       COALESCE(e.context#>>'{raw_payload,diagnostics,signals,coolant_c}', e.context#>>'{diagnostics,signals,coolant_c}', e.context->>'temperature', e.metadata->>'temperature') AS engine_temperature,
       COALESCE(e.context#>>'{raw_payload,data,error_code}', e.context->>'error_code', e.metadata->>'error_code', NULLIF(e.error_code::text, '')) AS error_code,
       COALESCE(e.context#>>'{raw_payload,data,imu_accel_delta_mps2}', e.context->>'imu_accel_delta_mps2', e.metadata->>'imu_accel_delta_mps2') AS imu_accel_delta_mps2
     FROM target_session s
     JOIN event_logs e ON e.device_id = s.device_id
      AND e.event_code = 'mqtt_bridge_rawdata'
      AND (
        e.session_id = s.id
        OR (
          e.session_id IS NULL
          AND s.status = 'completed'
          AND ${SESSION_CLOSE_TIMESTAMP_SQL} IS NOT NULL
          AND ${SESSION_TELEMETRY_TIMESTAMP_SQL} BETWEEN
            ${SESSION_CLOSE_TIMESTAMP_SQL} - INTERVAL '15 seconds'
            AND ${SESSION_CLOSE_TIMESTAMP_SQL} + INTERVAL '60 seconds'
          AND (
            (
              ${SESSION_LOCAL_KEY_SQL} ~ '^[0-9]+$'
              AND s.local_session_key IS NOT NULL
              AND (${SESSION_LOCAL_KEY_SQL})::bigint = s.local_session_key
            )
            OR (
              ${SESSION_BOOT_ID_SQL} IS NOT NULL
              AND s.firmware_boot_id IS NOT NULL
              AND ${SESSION_BOOT_ID_SQL} = s.firmware_boot_id
            )
          )
        )
      )
     ORDER BY ${SESSION_TELEMETRY_TIMESTAMP_SQL} ASC, e.server_timestamp ASC
     LIMIT 10000`,
    [deviceId, sessionId],
  );

  return {
    sessionId,
    data: rows.map((row) => ({
      timestamp: row.telemetry_timestamp.toISOString(),
      latitude: parseNullableNumber(row.latitude),
      longitude: parseNullableNumber(row.longitude),
      speed: parseNullableNumber(row.speed),
      deviceBattery: parseNullableNumber(row.device_battery),
      vehicleBattery: parseNullableNumber(row.vehicle_battery),
      temperature: parseNullableNumber(row.temperature),
      engineTemperature: parseNullableNumber(row.engine_temperature),
      errorCode: parseNullableNumber(row.error_code),
      imuAccelDeltaMps2: parseNullableNumber(row.imu_accel_delta_mps2),
    })),
  };
};
