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
    file_path VARCHAR(512) NOT NULL,
    size BIGINT NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firmware_version ON firmware(version);
CREATE INDEX IF NOT EXISTS idx_firmware_active ON firmware(is_active) WHERE is_active = true;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_firmware_updated_at'
          AND tgrelid = 'firmware'::regclass
    ) THEN
        CREATE TRIGGER trigger_firmware_updated_at
            BEFORE UPDATE ON firmware
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- firmware_update_log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS firmware_update_log (
    id BIGSERIAL PRIMARY KEY,
    job_id VARCHAR(80),
    device_id VARCHAR(50) REFERENCES devices(device_id) ON DELETE CASCADE,
    firmware_id INTEGER REFERENCES firmware(id) ON DELETE CASCADE,
    status firmware_status_enum,
    progress INTEGER CHECK (progress >= 0 AND progress <= 100),
    target_version VARCHAR(50),
    current_version VARCHAR(50),
    partition VARCHAR(32),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    status_reason_code VARCHAR(64),
    first_assigned_at TIMESTAMPTZ,
    command_dispatched_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ,
    last_message_id UUID,
    last_seq_no BIGINT,
    last_boot_id VARCHAR(80),
    confirm_timeout_sec INTEGER DEFAULT 180 CHECK (confirm_timeout_sec > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_firmware_update_log_device_id ON firmware_update_log(device_id);
CREATE INDEX IF NOT EXISTS idx_firmware_update_log_firmware_id ON firmware_update_log(firmware_id);
CREATE INDEX IF NOT EXISTS idx_firmware_update_log_status ON firmware_update_log(status);
CREATE INDEX IF NOT EXISTS idx_firmware_update_log_device_created_desc ON firmware_update_log(device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_firmware_update_log_job_id ON firmware_update_log(job_id);
CREATE INDEX IF NOT EXISTS idx_firmware_update_log_job_device ON firmware_update_log(job_id, device_id);
CREATE INDEX IF NOT EXISTS idx_firmware_update_log_last_seen ON firmware_update_log(last_seen_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trigger_firmware_update_log_updated_at'
          AND tgrelid = 'firmware_update_log'::regclass
    ) THEN
        CREATE TRIGGER trigger_firmware_update_log_updated_at
            BEFORE UPDATE ON firmware_update_log
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;
