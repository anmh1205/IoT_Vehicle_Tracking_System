-- =============================================================================
-- cleanup-keep-core-master-data.sql
-- Purge runtime/history domains while preserving core master/config records.
-- Keeps:
--   - users, user_device_access
--   - devices, customers, vehicles
--   - firmware catalog, error definitions, system settings, notification prefs
--   - GIS admin unit reference data
-- Removes:
--   - telemetry/session/log/audit/runtime history
--   - trips/alerts/violations/maintenance
--   - driver and geofence/policy configuration domains
-- =============================================================================

BEGIN;

DO $$
DECLARE
  target_tables TEXT[] := ARRAY[
    'notification_states',
    'export_jobs',
    'user_online_status',
    'fcm_tokens',
    'system_admin_idempotency_keys',
    'system_admin_setting_revisions',
    'user_sessions',
    'user_audit_logs',
    'device_audit_logs',
    'firmware_audit_logs',
    'audit_logs',
    'policy_audit_logs',
    'validation_errors',
    'event_logs',
    'device_commands',
    'firmware_update_log',
    'device_sessions',
    'violations',
    'alerts',
    'trips',
    'maintenance',
    'vehicle_policy_state',
    'geofence_vehicles',
    'geofences',
    'vehicle_policies',
    'vehicle_allowed_zones',
    'vehicle_zones',
    'admin_boundaries',
    'drivers'
  ];
  truncate_sql TEXT;
BEGIN
  SELECT STRING_AGG(FORMAT('%I', tablename), ', ')
  INTO truncate_sql
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename = ANY(target_tables);

  IF truncate_sql IS NOT NULL THEN
    EXECUTE 'TRUNCATE TABLE ' || truncate_sql || ' RESTART IDENTITY CASCADE';
  END IF;
END $$;

UPDATE devices
SET current_status = 'stopped',
    ignition_state = NULL,
    motion_state = NULL,
    vehicle_state = NULL,
    device_state = NULL,
    sleep_mode = NULL,
    state_updated_at = NULL,
    total_runtime_seconds = 0,
    latitude = NULL,
    longitude = NULL,
    last_latitude = NULL,
    last_longitude = NULL,
    last_speed = NULL,
    last_seen_at = NULL,
    last_error_code = 0,
    updated_at = NOW();

COMMIT;
