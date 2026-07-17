-- =============================================================================
-- 01-users.sql
-- Users, user sessions, and user-device access tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) DEFAULT 'No name',
    role VARCHAR(20) DEFAULT 'user',
    device_access_mode VARCHAR(20) DEFAULT 'all',
    status VARCHAR(20) DEFAULT 'active',
    email VARCHAR(100),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- -----------------------------------------------------------------------------
-- Seed: Default admin account
-- Username: admin  |  Password: Admin@2026  |  Role: admin
-- ⚠️ CHANGE PASSWORD IMMEDIATELY after first login in production!
-- -----------------------------------------------------------------------------
INSERT INTO users (username, password_hash, full_name, role, device_access_mode, status, email)
VALUES (
    'admin',
    '$2a$12$iZP02NlhuT/z5W8U7Q7eHOfydGsNPt1tnJFIIR5YGPpgyBmQaKrci',
    'System Administrator',
    'admin',
    'all',
    'active',
    'admin@tracking.local'
) ON CONFLICT (username) DO NOTHING;

CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- user_sessions (database-backed session tokens)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(128) UNIQUE NOT NULL,
    login_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active) WHERE is_active = TRUE;

CREATE TRIGGER trigger_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- user_device_access (FK to devices added in 02-devices.sql)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_device_access (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(50) NOT NULL,
    granted_by INT REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_device_access_user_id ON user_device_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_device_access_device_id ON user_device_access(device_id);
