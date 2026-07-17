-- =============================================================================
-- 19-device-session-runtime-seconds.sql
-- Ensure authoritative session runtime totals exist on upgraded environments
-- =============================================================================

ALTER TABLE device_sessions
  ADD COLUMN IF NOT EXISTS total_runtime_seconds BIGINT;

UPDATE device_sessions
SET total_runtime_seconds = COALESCE(total_runtime_seconds, uptime)
WHERE total_runtime_seconds IS NULL
  AND uptime IS NOT NULL;
