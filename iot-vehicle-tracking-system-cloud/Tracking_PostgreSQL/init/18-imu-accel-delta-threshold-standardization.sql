-- =============================================================================
-- 18-imu-accel-delta-threshold-standardization.sql
-- Canonicalize device alert threshold semantics to IMU acceleration delta m/s^2
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'devices' AND column_name = 'vibration_threshold'
  ) THEN
    ALTER TABLE devices
      RENAME COLUMN vibration_threshold TO imu_accel_delta_threshold_mps2;
  END IF;
END $$;
