"""Each DS3231 read or synchronization holds the I2C lock across the calendar
and status transfers. A read bases trust in the calendar on status from the
same operation, and a failed transfer releases the bus.
"""

import subprocess

import pytest

from host_build import CORE, FIRMWARE, PLATFORM, build_fixture


@pytest.fixture(scope="module")
def rtc_fixture(tmp_path_factory):
    board = FIRMWARE / "components/board"
    stubs = FIRMWARE / "tests/stubs"
    executable = tmp_path_factory.mktemp("rtc-consistency") / "rtc-consistency-fixture"
    build_fixture(
        executable,
        [
            FIRMWARE / "tests/rtc_consistency_fixture.c",
            board / "src/drivers/ds3231.c",
            board / "src/drivers/drivers_calc.c",
            CORE / "src/base/civil.c",
            PLATFORM / "src/platform.c",
        ],
        ["-I", stubs, "-I", board / "src", "-I", board / "include", "-I", PLATFORM / "include",
         "-include", stubs / "esp_err_name.h", "-ffunction-sections"],
        linker_flags=["-Wl,--gc-sections", "-lm"],
    )
    return executable


def test_rtc_read_does_not_trust_calendar_from_before_sync(rtc_fixture):
    subprocess.run([rtc_fixture, "sync_during_read"], check=True, timeout=5)


def test_rtc_writer_serializes_calendar_and_status(rtc_fixture):
    subprocess.run([rtc_fixture, "read_during_sync"], check=True, timeout=5)


def test_rtc_bus_is_released_after_transfer_failure(rtc_fixture):
    subprocess.run([rtc_fixture, "transfer_failure"], check=True, timeout=5)
