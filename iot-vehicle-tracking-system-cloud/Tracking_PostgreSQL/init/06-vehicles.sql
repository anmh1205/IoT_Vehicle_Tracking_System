-- =============================================================================
-- 06-vehicles.sql
-- Customers table (created first) and vehicles table
-- =============================================================================

-- -----------------------------------------------------------------------------
-- customers (must be created before vehicles due to FK dependency)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(50) UNIQUE NOT NULL,
    customer_type customer_type DEFAULT 'individual',
    name VARCHAR(200) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    tax_code VARCHAR(20),
    contact_person VARCHAR(100),
    status customer_status DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(customer_code);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

CREATE TRIGGER trigger_customers_updated_at
    BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -----------------------------------------------------------------------------
-- vehicles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) UNIQUE NOT NULL,
    plate_number VARCHAR(20) UNIQUE,
    device_id VARCHAR(50) REFERENCES devices(device_id),
    customer_id INT REFERENCES customers(id),
    vehicle_type vehicle_type,
    brand VARCHAR(50),
    model VARCHAR(50),
    year INTEGER,
    color VARCHAR(30),
    vin VARCHAR(50),
    seats INTEGER DEFAULT 5,
    transmission transmission_type,
    fuel_type fuel_type,
    mileage_km INTEGER DEFAULT 0,
    registration_number VARCHAR(50),
    insurance_expiry DATE,
    status vehicle_status DEFAULT 'active',
    icon_type VARCHAR(20) DEFAULT 'default',
    color_hex VARCHAR(7) DEFAULT '#000000',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_id ON vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_device_id ON vehicles(device_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);

CREATE TRIGGER trigger_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
