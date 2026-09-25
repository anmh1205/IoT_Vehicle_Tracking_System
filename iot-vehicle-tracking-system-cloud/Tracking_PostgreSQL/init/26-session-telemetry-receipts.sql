-- Make session telemetry aggregation idempotent across MQTT/offline replay.
CREATE TABLE IF NOT EXISTS device_session_telemetry_receipts (
    session_id BIGINT NOT NULL REFERENCES device_sessions(id) ON DELETE CASCADE,
    message_id VARCHAR(96) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (session_id, message_id)
);

CREATE INDEX IF NOT EXISTS idx_session_telemetry_receipts_received
    ON device_session_telemetry_receipts(received_at);
