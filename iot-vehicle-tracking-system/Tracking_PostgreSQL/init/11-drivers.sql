-- =============================================================================
-- 11-drivers.sql
-- Drivers table for vehicle-driver assignment
-- =============================================================================

CREATE TYPE driver_status AS ENUM ('active', 'inactive', 'suspended');

CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    driver_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    license_number VARCHAR(50),
    license_type VARCHAR(20),
    license_expiry DATE,
    date_of_birth DATE,
    address TEXT,
    avatar_url TEXT,
    status driver_status DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drivers_code ON drivers(driver_code);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_license ON drivers(license_number);

CREATE TRIGGER trigger_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
