CREATE TYPE validation_type_enum AS ENUM ('json_parse', 'missing_field', 'out_of_range', 'timestamp_anomaly', 'schema');

CREATE TABLE IF NOT EXISTS validation_errors (
    id SERIAL PRIMARY KEY,
    correlation_id VARCHAR(100),
    device_id VARCHAR(50) REFERENCES devices(device_id),
    validation_type validation_type_enum NOT NULL,
    field_name VARCHAR(100),
    expected_value TEXT,
    actual_value TEXT,
    payload_hash VARCHAR(64),
    payload_sample JSONB,
    server_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_errors_device_id ON validation_errors(device_id);
CREATE INDEX IF NOT EXISTS idx_validation_errors_type ON validation_errors(validation_type);
CREATE INDEX IF NOT EXISTS idx_validation_errors_timestamp ON validation_errors(server_timestamp);
