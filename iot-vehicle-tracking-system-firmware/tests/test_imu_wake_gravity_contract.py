"""LIS3DSH threshold wake must not self-trigger continuously on Earth's gravity."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "components/app-core/src/state_wake_prelude.c").read_text(encoding="utf-8")
DRIVER = (ROOT / "components/platform-board-esp32s3/src/imu_lis3dsh.c").read_text(encoding="utf-8")
HEADER = (ROOT / "components/platform-board-esp32s3/include/imu_lis3dsh.h").read_text(encoding="utf-8")


def test_absolute_sm1_threshold_exceeds_static_one_g():
    assert "imu_configure_motion_interrupt(1360, 200)" in APP
    assert "uint16_t threshold_mg" in DRIVER
    assert "uint16_t threshold_mg" in HEADER
    assert "THRS1_1_REG, threshold" in DRIVER
