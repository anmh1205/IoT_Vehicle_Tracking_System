-- =============================================================================
-- 09-audit.sql
-- Audit tables, system config, notifications, online status, and export jobs
-- =============================================================================

-- -----------------------------------------------------------------------------
-- user_audit_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor_user_id INT REFERENCES users(id),
    actor_username VARCHAR(50),
    actor_ip VARCHAR(45),
    actor_user_agent TEXT,
    action user_audit_action_enum,
    resource_type VARCHAR(30),
    resource_id VARCHAR(100),
    target_user_id INT REFERENCES users(id),
    details JSONB,
    correlation_id VARCHAR(64),
    success BOOLEAN,
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_audit_timestamp ON user_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_audit_correlation ON user_audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_actor ON user_audit_logs(actor_user_id);

-- -----------------------------------------------------------------------------
-- device_audit_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor_user_id INT REFERENCES users(id),
    action device_audit_action_enum,
    device_id VARCHAR(50),
    changes JSONB,
    correlation_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_device_audit_timestamp ON device_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_device_audit_correlation ON device_audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_device_audit_actor ON device_audit_logs(actor_user_id);

-- -----------------------------------------------------------------------------
-- firmware_audit_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS firmware_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    actor_user_id INT REFERENCES users(id),
    action firmware_audit_action_enum,
    firmware_id INT,
    device_ids TEXT[],
    details JSONB,
    correlation_id VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_firmware_audit_timestamp ON firmware_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_firmware_audit_correlation ON firmware_audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_firmware_audit_actor ON firmware_audit_logs(actor_user_id);

-- -----------------------------------------------------------------------------
-- system_settings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    group_name VARCHAR(50) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- notification_preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    channels JSONB NOT NULL DEFAULT '["email"]',
    enabled BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user_id ON notification_preferences(user_id);

CREATE TRIGGER trigger_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- fcm_tokens (push notification tokens, soft delete via deleted_at)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_info JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON fcm_tokens(user_id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------------
-- user_online_status
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_online_status (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    is_online BOOLEAN DEFAULT false,
    last_active_at TIMESTAMPTZ,
    socket_id VARCHAR(100)
);

-- -----------------------------------------------------------------------------
-- export_jobs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS export_jobs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    export_type VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    filters JSONB,
    file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
