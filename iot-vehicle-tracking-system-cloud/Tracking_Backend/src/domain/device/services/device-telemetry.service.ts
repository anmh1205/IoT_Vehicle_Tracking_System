import { findMany } from '@/infrastructure/database/queries';

interface TelemetryRow {
  server_timestamp: Date;
  value: string | null;
}

const DEFAULT_METRIC = 'imuAccelDeltaMps2';
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
    value: "COALESCE(context->>'imu_accel_delta_mps2', metadata->>'imu_accel_delta_mps2', context->>'vibration', metadata->>'vibration')",
    exists: "(context ? 'imu_accel_delta_mps2' OR metadata ? 'imu_accel_delta_mps2' OR context ? 'vibration' OR metadata ? 'vibration')",
  },
  speed: {
    value:
      "COALESCE(context#>>'{raw_payload,data,speed}', context->>'speed', metadata->>'speed')",
    exists:
      "((context#>>'{raw_payload,data,speed}') IS NOT NULL OR context ? 'speed' OR metadata ? 'speed')",
  },
  vehicleBattery: {
    value: "COALESCE(context->>'vehicle_battery', metadata->>'vehicle_battery')",
    exists: "(context ? 'vehicle_battery' OR metadata ? 'vehicle_battery')",
  },
  deviceBattery: {
    value: "COALESCE(context->>'device_battery', metadata->>'device_battery')",
    exists: "(context ? 'device_battery' OR metadata ? 'device_battery')",
  },
  temperature: {
    value:
      "COALESCE(context->>'temperature', metadata->>'temperature', context#>>'{diagnostics,signals,intake_air_temp_c}', metadata#>>'{diagnostics,signals,intake_air_temp_c}')",
    exists:
      "(context ? 'temperature' OR metadata ? 'temperature' OR (context#>>'{diagnostics,signals,intake_air_temp_c}') IS NOT NULL OR (metadata#>>'{diagnostics,signals,intake_air_temp_c}') IS NOT NULL)",
  },
  engineTemperature: {
    value:
      "COALESCE(context#>>'{diagnostics,signals,coolant_c}', context->>'temperature', metadata#>>'{diagnostics,signals,coolant_c}', metadata->>'temperature')",
    exists:
      "((context#>>'{diagnostics,signals,coolant_c}') IS NOT NULL OR context ? 'temperature' OR (metadata#>>'{diagnostics,signals,coolant_c}') IS NOT NULL OR metadata ? 'temperature')",
  },
  latitude: {
    value:
      "COALESCE(context#>>'{raw_payload,data,latitude}', context->>'latitude', metadata->>'latitude')",
    exists:
      "((context#>>'{raw_payload,data,latitude}') IS NOT NULL OR context ? 'latitude' OR metadata ? 'latitude')",
  },
  longitude: {
    value:
      "COALESCE(context#>>'{raw_payload,data,longitude}', context->>'longitude', metadata->>'longitude')",
    exists:
      "((context#>>'{raw_payload,data,longitude}') IS NOT NULL OR context ? 'longitude' OR metadata ? 'longitude')",
  },
  errorCode: {
    value: "COALESCE(context->>'error_code', metadata->>'error_code', NULLIF(error_code::text, ''))",
    exists: "(context ? 'error_code' OR metadata ? 'error_code' OR error_code IS NOT NULL)",
  },
  rpm: {
    value:
      "COALESCE(context#>>'{diagnostics,signals,rpm}', context->>'rpm', metadata#>>'{diagnostics,signals,rpm}', metadata->>'rpm')",
    exists:
      "((context#>>'{diagnostics,signals,rpm}') IS NOT NULL OR context ? 'rpm' OR (metadata#>>'{diagnostics,signals,rpm}') IS NOT NULL OR metadata ? 'rpm')",
  },
  obdSpeedKph: {
    value:
      "COALESCE(context#>>'{diagnostics,signals,obd_speed_kph}', context->>'obd_speed_kph', metadata#>>'{diagnostics,signals,obd_speed_kph}', metadata->>'obd_speed_kph')",
    exists:
      "((context#>>'{diagnostics,signals,obd_speed_kph}') IS NOT NULL OR context ? 'obd_speed_kph' OR (metadata#>>'{diagnostics,signals,obd_speed_kph}') IS NOT NULL OR metadata ? 'obd_speed_kph')",
  },
  obdCoolantC: {
    value:
      "COALESCE(context#>>'{diagnostics,signals,coolant_c}', metadata#>>'{diagnostics,signals,coolant_c}')",
    exists:
      "((context#>>'{diagnostics,signals,coolant_c}') IS NOT NULL OR (metadata#>>'{diagnostics,signals,coolant_c}') IS NOT NULL)",
  },
};

const resolveMetricKey = (metric: string | undefined): string => {
  const normalizedMetric = String(metric ?? '').trim().toLowerCase();
  return METRIC_ALIASES[normalizedMetric] ?? DEFAULT_METRIC;
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
    `SELECT server_timestamp, ${sql.value} AS value
     FROM event_logs
     WHERE device_id = $1
       AND server_timestamp BETWEEN $2 AND $3
       AND ${sql.exists}
     ORDER BY server_timestamp ASC
     LIMIT 5000`,
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
        timestamp: row.server_timestamp.toISOString(),
        value,
      }];
    }),
  };
};
