-- =============================================================================
-- 03-error-codes.sql
-- Error code definitions with seed data
-- =============================================================================

CREATE TABLE IF NOT EXISTS error_code_definitions (
    code INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_vi VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('connection', 'battery', 'vibration', 'firmware', 'sensor', 'system')),
    severity VARCHAR(20) CHECK (severity IN ('critical', 'warning', 'info')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trigger_error_code_definitions_updated_at
    BEFORE UPDATE ON error_code_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed data
INSERT INTO error_code_definitions (code, name, name_vi, category, severity) VALUES
(0, 'Normal Operation', 'Hoạt động bình thường', 'system', 'info'),
(1, 'High Vibration Warning', 'Cảnh báo rung cao', 'vibration', 'warning'),
(2, 'Network Connection Error', 'Lỗi kết nối mạng', 'connection', 'warning'),
(3, 'Low Battery', 'Pin yếu', 'battery', 'warning'),
(4, 'Sensor Malfunction', 'Lỗi cảm biến', 'sensor', 'critical'),
(5, 'Firmware Update Required', 'Cần cập nhật firmware', 'firmware', 'info'),
(6, 'Critical Battery Low', 'Pin cực thấp', 'battery', 'critical'),
(7, 'Connection Lost', 'Mất kết nối', 'connection', 'critical'),
(8, 'Vibration Sensor Calibration Needed', 'Cần hiệu chuẩn cảm biến rung', 'sensor', 'warning'),
(9, 'Firmware Update Failed', 'Cập nhật firmware thất bại', 'firmware', 'critical')
ON CONFLICT (code) DO NOTHING;
