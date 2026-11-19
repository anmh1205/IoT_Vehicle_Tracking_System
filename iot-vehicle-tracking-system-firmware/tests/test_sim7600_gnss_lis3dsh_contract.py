"""SIM7600 GNSS and LIS3DSH motion interrupt register-contract regressions."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GNSS = (ROOT / "components/adapter-modem-sim7600-at/src/modem_gnss.c").read_text(encoding="utf-8")
IMU = (ROOT / "components/platform-board-esp32s3/src/imu_lis3dsh.c").read_text(encoding="utf-8")


def test_sim7600_uses_cgnssinfo_and_cgps_commands():
    assert 'modem_at_send("AT+CGNSSINFO\\r"' in GNSS
    assert "AT+CGNSINF" not in GNSS
    assert "AT+CGNSPWR" not in GNSS
    assert 'modem_at_send("AT+CGPS=1\\r"' in GNSS
    assert 'modem_at_send_expect("AT+CGPS=0\\r"' in GNSS
    assert "modem_gnss_parse_nmea_degrees(fields[4], fields[5][0], &lat)" in GNSS
    assert "modem_gnss_parse_nmea_degrees(fields[6], fields[7][0], &lon)" in GNSS
    assert "fields[11]" in GNSS and "fields[12]" in GNSS


def test_lis3dsh_uses_sm1_not_lis3dh_interrupt_bank():
    config = IMU.split("esp_err_t imu_configure_motion_interrupt(", 1)[1].split("esp_err_t imu_clear_motion_interrupt(", 1)[0]
    sm1 = config.split("if (imu_is_lis3dsh()) {", 1)[1].split("return imu_clear_motion_interrupt();", 1)[0]
    assert "LIS3DSH_THRS1_1_REG" in sm1
    assert "LIS3DSH_MASK1_A_REG" in sm1
    assert "LIS3DSH_SETT1_REG" in sm1
    assert "LIS3DSH_ST1_1_REG" in sm1
    assert "imu_write_reg(LIS3DSH_ST1_1_REG, 0x05)" in sm1
    assert "imu_write_reg(LIS3DSH_ST1_2_REG, 0x11)" in sm1
    assert "imu_write_reg(LIS3DSH_SETT1_REG, 0x00)" in sm1
    assert "IMU_INT1_CFG_REG" not in sm1
    assert "IMU_INT1_THS_REG" not in sm1
    assert "LIS3DSH_OUTS1_REG : IMU_INT1_SRC_REG" in IMU
    assert "imu_configure_motion_interrupt(uint16_t threshold_mg" in IMU
