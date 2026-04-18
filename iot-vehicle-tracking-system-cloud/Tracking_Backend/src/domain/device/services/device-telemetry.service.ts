import { findMany } from '@/infrastructure/database/queries';

interface TelemetryRow {
  server_timestamp: Date;
  value: string | null;
}

const ALLOWED_METRICS = ['vib', 'spd', 'bt', 'bb', 'temp', 'lat', 'lon', 'err'];

const METRIC_SQL: Record<string, { value: string; exists: string }> = {
  vib: {
    value:
      "COALESCE(context->>'vib', context->>'vibration', metadata->>'vib', metadata->>'vibration')",
    exists:
      "(context ? 'vib' OR context ? 'vibration' OR metadata ? 'vib' OR metadata ? 'vibration')",
  },
  spd: {
    value:
      "COALESCE(context->>'spd', context->>'speed', metadata->>'spd', metadata->>'speed')",
    exists:
      "(context ? 'spd' OR context ? 'speed' OR metadata ? 'spd' OR metadata ? 'speed')",
  },
  bt: {
    value:
      "COALESCE(context->>'bt', context->>'vehicleBattery', context->>'vehicle_battery', metadata->>'bt', metadata->>'vehicleBattery', metadata->>'vehicle_battery')",
    exists:
      "(context ? 'bt' OR context ? 'vehicleBattery' OR context ? 'vehicle_battery' OR metadata ? 'bt' OR metadata ? 'vehicleBattery' OR metadata ? 'vehicle_battery')",
  },
  bb: {
    value:
      "COALESCE(context->>'bb', context->>'batt', context->>'battery', context->>'deviceBattery', metadata->>'bb', metadata->>'batt', metadata->>'battery', metadata->>'deviceBattery')",
    exists:
      "(context ? 'bb' OR context ? 'batt' OR context ? 'battery' OR context ? 'deviceBattery' OR metadata ? 'bb' OR metadata ? 'batt' OR metadata ? 'battery' OR metadata ? 'deviceBattery')",
  },
  temp: {
    value:
      "COALESCE(context->>'temp', context->>'engineTemp', context->>'engine_temperature', metadata->>'temp', metadata->>'engineTemp', metadata->>'engine_temperature')",
    exists:
      "(context ? 'temp' OR context ? 'engineTemp' OR context ? 'engine_temperature' OR metadata ? 'temp' OR metadata ? 'engineTemp' OR metadata ? 'engine_temperature')",
  },
  lat: {
    value:
      "COALESCE(context->>'lat', context->>'latitude', metadata->>'lat', metadata->>'latitude')",
    exists:
      "(context ? 'lat' OR context ? 'latitude' OR metadata ? 'lat' OR metadata ? 'latitude')",
  },
  lon: {
    value:
      "COALESCE(context->>'lon', context->>'longitude', metadata->>'lon', metadata->>'longitude')",
    exists:
      "(context ? 'lon' OR context ? 'longitude' OR metadata ? 'lon' OR metadata ? 'longitude')",
  },
  err: {
    value: "COALESCE(context->>'err', metadata->>'err', NULLIF(error_code::text, ''))",
    exists: "(context ? 'err' OR metadata ? 'err' OR error_code IS NOT NULL)",
  },
};

export const getTelemetry = async (
  deviceId: string,
  params: { metric: string; from?: string; to?: string },
) => {
  const metric = ALLOWED_METRICS.includes(params.metric) ? params.metric : 'vib';
  const from = params.from ? new Date(params.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const to = params.to ? new Date(params.to) : new Date();
  const sql = METRIC_SQL[metric] ?? METRIC_SQL.vib;

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
    metric,
    data: rows.map((row) => ({
      timestamp: row.server_timestamp.toISOString(),
      value: row.value ? Number.parseFloat(row.value) : 0,
    })),
  };
};
