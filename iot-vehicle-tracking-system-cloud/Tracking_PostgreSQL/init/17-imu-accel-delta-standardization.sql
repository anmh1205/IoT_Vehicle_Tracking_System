-- =============================================================================
-- 17-imu-accel-delta-standardization.sql
-- Canonicalize IMU vibration semantics to acceleration delta in m/s^2
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'device_sessions' AND column_name = 'avg_vibration'
  ) THEN
    ALTER TABLE device_sessions
      RENAME COLUMN avg_vibration TO avg_imu_accel_delta_mps2;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'device_sessions' AND column_name = 'min_vibration'
  ) THEN
    ALTER TABLE device_sessions
      RENAME COLUMN min_vibration TO min_imu_accel_delta_mps2;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'device_sessions' AND column_name = 'max_vibration'
  ) THEN
    ALTER TABLE device_sessions
      RENAME COLUMN max_vibration TO max_imu_accel_delta_mps2;
  END IF;
END $$;

UPDATE event_logs
SET context = jsonb_set(
      context - 'vibration',
      '{imu_accel_delta_mps2}',
      COALESCE(context->'imu_accel_delta_mps2', context->'vibration', 'null'::jsonb),
      true
    )
WHERE context IS NOT NULL
  AND (context ? 'vibration' OR context ? 'imu_accel_delta_mps2');

UPDATE event_logs
SET context = jsonb_set(
      context,
      '{raw_payload,data,imu_accel_delta_mps2}',
      COALESCE(
        context#>'{raw_payload,data,imu_accel_delta_mps2}',
        context#>'{raw_payload,data,vibration}',
        'null'::jsonb
      ),
      true
    )
WHERE context IS NOT NULL
  AND (
    context#>'{raw_payload,data,vibration}' IS NOT NULL
    OR context#>'{raw_payload,data,imu_accel_delta_mps2}' IS NOT NULL
  );

UPDATE event_logs
SET context = context #- '{raw_payload,data,vibration}'
WHERE context#>'{raw_payload,data,vibration}' IS NOT NULL;
