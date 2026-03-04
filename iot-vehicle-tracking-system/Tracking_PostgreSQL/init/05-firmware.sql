-- =============================================================================
-- 05-firmware.sql
-- Firmware registry and firmware update log tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- firmware
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS firmware (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50) UNIQUE NOT NULL,
    filename VARCHAR(255) UNIQUE NOT NULL,
    size BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firmware_version ON firmware(version);
CREATE INDEX IF NOT EXISTS idx_firmware_active ON firmware(is_active) WHERE is_active = true;

CREATE TRIGGER trigger_firmware_updated_at
    BEFORE UPDATE ON firmware
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- firmware_update_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS firmware_update_log (
    id BIGSERIAL PRIMARY KEY,
    device_id VARCHAR(50) REFERENCES devices(device_id) ON DELETE CASCADE,
    firmware_id INTEGER REFERENCES firmware(id) ON DELETE CASCADE,
    status firmware_status_enum,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firmware_update_log_device_id ON firmware_update_log(device_id);
CREATE INDEX IF NOT EXISTS idx_firmware_update_log_firmware_id ON firmware_update_log(firmware_id);
CREATE INDEX IF NOT EXISTS idx_firmware_update_log_status ON firmware_update_log(status);
