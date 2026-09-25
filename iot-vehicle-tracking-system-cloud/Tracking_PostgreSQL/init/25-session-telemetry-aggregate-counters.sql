-- Correct device-session telemetry aggregates and preserve metric-specific denominators.
ALTER TABLE device_sessions
  ADD COLUMN IF NOT EXISTS imu_accel_samples_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_battery_samples_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS device_battery_samples_count INT NOT NULL DEFAULT 0;

WITH extracted AS (
  SELECT
    session_id,
    COALESCE(
      context#>>'{raw_payload,data,imu_accel_delta_mps2}',
      context->>'imu_accel_delta_mps2',
      metadata->>'imu_accel_delta_mps2',
      context->>'vibration',
      metadata->>'vibration'
    ) AS imu_text,
    COALESCE(
      context#>>'{raw_payload,data,vehicle_battery}',
      context->>'vehicle_battery',
      metadata->>'vehicle_battery'
    ) AS vehicle_battery_text,
    COALESCE(
      context#>>'{raw_payload,data,device_battery}',
      context->>'device_battery',
      metadata->>'device_battery'
    ) AS device_battery_text
  FROM event_logs
  WHERE session_id IS NOT NULL
    AND event_code = 'mqtt_bridge_rawdata'
),
numeric_samples AS (
  SELECT
    session_id,
    CASE
      WHEN imu_text ~ '^[+-]?([0-9]+([.][0-9]+)?|[.][0-9]+)$' THEN imu_text::numeric
      ELSE NULL
    END AS imu_value,
    CASE
      WHEN vehicle_battery_text ~ '^[+-]?([0-9]+([.][0-9]+)?|[.][0-9]+)$'
        THEN vehicle_battery_text::numeric
      ELSE NULL
    END AS vehicle_battery_value,
    CASE
      WHEN device_battery_text ~ '^[+-]?([0-9]+([.][0-9]+)?|[.][0-9]+)$'
        THEN device_battery_text::numeric
      ELSE NULL
    END AS device_battery_value
  FROM extracted
),
aggregated AS (
  SELECT
    session_id,
    AVG(imu_value) AS avg_imu,
    MIN(imu_value) AS min_imu,
    MAX(imu_value) AS max_imu,
    COUNT(imu_value)::int AS imu_count,
    AVG(vehicle_battery_value) AS avg_vehicle_battery,
    COUNT(vehicle_battery_value)::int AS vehicle_battery_count,
    AVG(device_battery_value) AS avg_device_battery,
    COUNT(device_battery_value)::int AS device_battery_count
  FROM numeric_samples
  GROUP BY session_id
)
UPDATE device_sessions s
SET
  avg_imu_accel_delta_mps2 =
    CASE WHEN a.imu_count > 0 THEN ROUND(a.avg_imu, 3) ELSE s.avg_imu_accel_delta_mps2 END,
  min_imu_accel_delta_mps2 =
    CASE WHEN a.imu_count > 0 THEN ROUND(a.min_imu, 3) ELSE s.min_imu_accel_delta_mps2 END,
  max_imu_accel_delta_mps2 =
    CASE WHEN a.imu_count > 0 THEN ROUND(a.max_imu, 3) ELSE s.max_imu_accel_delta_mps2 END,
  imu_accel_samples_count =
    CASE WHEN a.imu_count > 0 THEN a.imu_count ELSE s.imu_accel_samples_count END,
  avg_vehicle_battery =
    CASE WHEN a.vehicle_battery_count > 0 THEN ROUND(a.avg_vehicle_battery, 2) ELSE s.avg_vehicle_battery END,
  vehicle_battery_samples_count =
    CASE WHEN a.vehicle_battery_count > 0 THEN a.vehicle_battery_count ELSE s.vehicle_battery_samples_count END,
  avg_device_battery =
    CASE WHEN a.device_battery_count > 0 THEN ROUND(a.avg_device_battery, 2) ELSE s.avg_device_battery END,
  device_battery_samples_count =
    CASE WHEN a.device_battery_count > 0 THEN a.device_battery_count ELSE s.device_battery_samples_count END,
  updated_at = NOW()
FROM aggregated a
WHERE s.id = a.session_id;

-- If legacy summary values exist but their raw events are no longer retained,
-- retain the value and seed a conservative denominator for future samples.
UPDATE device_sessions
SET
  imu_accel_samples_count = CASE
    WHEN imu_accel_samples_count = 0 AND avg_imu_accel_delta_mps2 IS NOT NULL
      THEN GREATEST(COALESCE(data_points_count, 0), 1)
    ELSE imu_accel_samples_count
  END,
  vehicle_battery_samples_count = CASE
    WHEN vehicle_battery_samples_count = 0 AND avg_vehicle_battery IS NOT NULL
      THEN GREATEST(COALESCE(data_points_count, 0), 1)
    ELSE vehicle_battery_samples_count
  END,
  device_battery_samples_count = CASE
    WHEN device_battery_samples_count = 0 AND avg_device_battery IS NOT NULL
      THEN GREATEST(COALESCE(data_points_count, 0), 1)
    ELSE device_battery_samples_count
  END;
