-- =============================================================================
-- 21-realtime-session-query-indexes.sql
-- Keep device session and realtime modal queries index-backed.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_device_sessions_device_created_desc
ON device_sessions(device_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_event_logs_session_mqtt_rawdata
ON event_logs(session_id)
WHERE session_id IS NOT NULL
  AND event_code = 'mqtt_bridge_rawdata';

CREATE INDEX IF NOT EXISTS idx_event_logs_device_mqtt_time_desc
ON event_logs(device_id, server_timestamp DESC)
WHERE event_code = 'mqtt_bridge_rawdata';

ANALYZE device_sessions;
ANALYZE event_logs;
