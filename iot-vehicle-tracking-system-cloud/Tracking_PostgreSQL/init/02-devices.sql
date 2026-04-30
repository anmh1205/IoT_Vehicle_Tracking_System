-- =============================================================================
-- 02-devices.sql
-- Devices, device sessions, and deferred FK for user_device_access
-- =============================================================================

-- -----------------------------------------------------------------------------
-- devices
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) UNIQUE NOT NULL,
    device_name VARCHAR(100) NOT NULL,
    auth_token VARCHAR(64) UNIQUE NOT NULL,
    last_seen_at TIMESTAMPTZ,
    current_status device_status_enum DEFAULT 'stopped',
    ignition_state ignition_state_enum,
    motion_state motion_state_enum,
    vehicle_state vehicle_runtime_state_enum,
    device_state device_runtime_state_enum,
    sleep_mode sleep_mode_enum,
    state_updated_at TIMESTAMPTZ,
    total_runtime_seconds BIGINT DEFAULT 0,
    imei VARCHAR(20),
    vibration_threshold DECIMAL(8,3) DEFAULT 1.000,
    request_interval INT DEFAULT 2000,
    firmware_version VARCHAR(20),
    target_firmware_version VARCHAR(20),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    config JSONB,
    last_error_code INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_devices_auth_token ON devices(auth_token);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(current_status);
CREATE INDEX IF NOT EXISTS idx_devices_last_seen ON devices(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_devices_state_updated_at ON devices(state_updated_at DESC);

CREATE TRIGGER trigger_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- device_sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_sessions (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(device_id) ON DELETE CASCADE,
    status session_status_enum DEFAULT 'running',
    server_session_start TIMESTAMPTZ,
    server_session_end TIMESTAMPTZ,
    session_start TIMESTAMPTZ,
    session_end TIMESTAMPTZ,
    uptime INT,
    avg_vibration DECIMAL(8,3),
    min_vibration DECIMAL(8,3),
    max_vibration DECIMAL(8,3),
    avg_vehicle_battery DECIMAL(4,2),
    avg_device_battery DECIMAL(4,2),
    data_points_count INT DEFAULT 0,
    last_update TIMESTAMPTZ,
    start_correlation_id VARCHAR(64),
    end_correlation_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_status ON device_sessions(status);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_end_null ON device_sessions(device_id)
    WHERE session_end IS NULL;

CREATE TRIGGER trigger_device_sessions_updated_at
    BEFORE UPDATE ON device_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- Add FK constraint to user_device_access now that devices table exists
-- -----------------------------------------------------------------------------
ALTER TABLE user_device_access
    ADD CONSTRAINT fk_user_device_access_device
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE;
