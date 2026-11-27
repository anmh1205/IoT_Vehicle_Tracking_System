"""Link-down releases the PM lock after the shutdown pulse, and PWRKEY restarts
wait for the guard to expire. Queued starts keep the stopped snapshot false,
retries honor backoff, and AT commands that require a result line and OK wait
for both in either order.
"""

from pathlib import Path
import subprocess

import pytest

from host_build import CORE, FIRMWARE, PLATFORM, build_fixture


@pytest.fixture(scope="module")
def modem_fixture(tmp_path_factory):
    build = tmp_path_factory.mktemp("modem-link")
    stubs = FIRMWARE / "tests" / "stubs"
    (build / "driver").mkdir()
    for header in ("esp_check.h", "esp_pm.h", "driver/gpio.h"):
        (build / header).symlink_to(stubs / "modem_link_test.h")

    modem = FIRMWARE / "components" / "modem"
    src = modem / "src"
    executable = build / "modem-link-fixture"
    build_fixture(
        executable,
        [FIRMWARE / "tests" / "modem_link_fixture.c", src / "modem.c", src / "modem_task.c",
         src / "services/link.c", src / "transport/modem_power.c", src / "mqtt/mqtt_session.c",
         src / "at/at_parser.c", src / "at/at_engine.c", CORE / "src/base/backoff.c",
         CORE / "src/base/civil.c", CORE / "src/base/str.c"],
        ["-D_POSIX_C_SOURCE=200809L", "-DCONFIG_PM_ENABLE=1", "-I", build, "-I", stubs,
         "-I", modem / "include", "-I", src, "-I", PLATFORM / "include"],
    )
    return executable


@pytest.mark.parametrize("case", [
    "link_up_queue_full",
    "restart_defers_power_pulse",
    "registration_restart_backoff",
    "sync_failure_power_cycle",
    "mqtt_final_before_ok",
    "mqtt_ok_before_final",
    "mqtt_final_error_before_error",
    "mqtt_missing_ok_times_out",
    "httpread_final_only",
])
def test_modem_link_and_at_responses(modem_fixture: Path, case: str):
    subprocess.run([modem_fixture, case], cwd=modem_fixture.parent, check=True, timeout=5)
