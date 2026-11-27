from pathlib import Path
import subprocess
import tempfile

import pytest

from host_build import CORE, FIRMWARE, PLATFORM, build_fixture


@pytest.fixture(scope="module")
def executable():
    components = FIRMWARE / "components"
    app = components / "app"
    with tempfile.TemporaryDirectory() as directory:
        executable = Path(directory) / "app-flow-fixture"
        build_fixture(
            executable,
            [
                FIRMWARE / "tests/app_flow_fixture.c",
                *sorted((app / "src").rglob("*.c")),
                PLATFORM / "src/platform_clock.c", PLATFORM / "src/platform_reset.c", *sorted(CORE.glob("src/**/*.c")),
            ],
            [
                "-I", PLATFORM / "include", "-I", FIRMWARE / "tests/stubs",
                "-I", app / "src",
                *[arg for name in ("app", "board", "modem", "obd", "ota", "storage")
                  for arg in ("-I", components / name / "include")],
            ],
        )
        yield executable


@pytest.mark.parametrize("case", [
    "raw_live_ack_error",
    "raw_broker_down",
    "raw_publisher_busy",
    "raw_queue_before_live",
    "raw_boundary_before_live",
    "replay_and_control_order",
    "ota_boot_normal",
    "ota_boot_landed",
    "ota_boot_landed_legacy",
    "ota_boot_rolled_back",
    "ota_confirm",
    "ota_deadline",
    "command_receipts",
    "restart_ack",
    "restart_timeout",
    "sleep_blocked_by_ota",
    "sleep_blocked_by_location",
    "sleep_blocked_by_restart",
    "sleep_radio_timeout",
    "sleep_radio_motion",
])
def test_app_flow(executable, case):
    subprocess.run([executable, case], check=True, timeout=5)
