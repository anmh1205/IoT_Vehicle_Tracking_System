-- =============================================================================
-- 04-event-logs.sql
-- Event logs table for device event tracking with error resolution workflow
-- =============================================================================

CREATE TABLE IF NOT EXISTS event_logs (
    id BIGSERIAL PRIMARY KEY,
    correlation_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(50) NOT NULL,
    session_id BIGINT REFERENCES device_sessions(id),
    event_type event_type_enum,
    event_code VARCHAR(32),
    severity severity_enum,
    context JSONB,
    metadata JSONB,
    message TEXT,
    device_timestamp TIMESTAMPTZ,
    server_timestamp TIMESTAMPTZ DEFAULT NOW(),
    error_code INTEGER REFERENCES error_code_definitions(code),
    resolved_at TIMESTAMPTZ,
    resolved_by INTEGER REFERENCES users(id),
    resolution_notes TEXT,
    error_status VARCHAR(20) CHECK (error_status IN ('active', 'resolved', 'acknowledged')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_device_time ON event_logs(device_id, server_timestamp);
CREATE INDEX IF NOT EXISTS idx_event_correlation ON event_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_event_type_time ON event_logs(event_type, server_timestamp);
CREATE INDEX IF NOT EXISTS idx_event_logs_error_status ON event_logs(error_status);
CREATE INDEX IF NOT EXISTS idx_event_logs_mqtt_bridge_code_time ON event_logs(server_timestamp)
WHERE event_code = 'mqtt_bridge_rawdata';
CREATE INDEX IF NOT EXISTS idx_event_logs_mqtt_bridge_source_time ON event_logs(server_timestamp)
WHERE context->>'source' = 'mqtt_bridge_rawdata';

CREATE UNIQUE INDEX IF NOT EXISTS uq_event_logs_mqtt_bridge_message
ON event_logs(device_id, (metadata->>'message_id'))
WHERE event_code = 'mqtt_bridge_rawdata'
  AND metadata->>'message_id' IS NOT NULL;

CREATE TRIGGER trigger_event_logs_updated_at
    BEFORE UPDATE ON event_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
