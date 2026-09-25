-- =============================================================================
-- 13-device-commands.sql
-- Persistent device command history for audit and end-to-end command flow
-- =============================================================================

CREATE TABLE IF NOT EXISTS device_commands (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
    command VARCHAR(100) NOT NULL,
    params JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'accepted', 'acknowledged', 'failed')),
    sent_at TIMESTAMPTZ,
    acked_at TIMESTAMPTZ,
    response TEXT,
    actor_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    correlation_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_commands_device_id_sent_at
    ON device_commands(device_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_commands_status
    ON device_commands(status);

CREATE INDEX IF NOT EXISTS idx_device_commands_correlation_id
    ON device_commands(correlation_id);

CREATE TRIGGER trigger_device_commands_updated_at
    BEFORE UPDATE ON device_commands
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
