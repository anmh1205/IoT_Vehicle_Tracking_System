-- =============================================================================
-- 16-authoritative-session-identity.sql
-- Persist firmware-authoritative session identity and provenance
-- =============================================================================

ALTER TABLE device_sessions
  ADD COLUMN IF NOT EXISTS local_session_key BIGINT,
  ADD COLUMN IF NOT EXISTS firmware_boot_id TEXT,
  ADD COLUMN IF NOT EXISTS canonical_source TEXT,
  ADD COLUMN IF NOT EXISTS boundary_source TEXT,
  ADD COLUMN IF NOT EXISTS start_reason TEXT,
  ADD COLUMN IF NOT EXISTS end_reason TEXT;

UPDATE device_sessions
SET canonical_source = COALESCE(canonical_source, 'server'),
    boundary_source = COALESCE(boundary_source, 'cloud_legacy')
WHERE canonical_source IS NULL
   OR boundary_source IS NULL;

ALTER TABLE device_sessions
  ALTER COLUMN canonical_source SET DEFAULT 'server',
  ALTER COLUMN canonical_source SET NOT NULL,
  ALTER COLUMN boundary_source SET DEFAULT 'firmware',
  ALTER COLUMN boundary_source SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_device_sessions_device_boot_local
  ON device_sessions(device_id, firmware_boot_id, local_session_key)
  WHERE firmware_boot_id IS NOT NULL AND local_session_key IS NOT NULL;
