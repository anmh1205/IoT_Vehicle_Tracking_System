"""Pending outbox events keep a parked device awake until delivery or the maximum awake time.
A location publish succeeds only if acknowledged before its deadline. At the
deadline, the command settles as a timeout and retains that result.
"""

import subprocess

import pytest

from host_build import CORE, FIRMWARE, PLATFORM, build_fixture


@pytest.fixture(scope="module")
def executable(tmp_path_factory):
    target = tmp_path_factory.mktemp("outbox-sleep") / "outbox-sleep-fixture"
    components = FIRMWARE / "components"
    app = components / "app" / "src"
    includes = [FIRMWARE / "tests" / "stubs", PLATFORM / "include", app]
    includes += [components / name / "include" for name in ("modem", "storage")]
    build_fixture(
        target,
        [FIRMWARE / "tests" / "outbox_sleep_fixture.c",
         app / "publish/outbox.c", app / "publish/publisher.c",
         app / "command/cmd_session.c", app / "command/cmd_inbox.c", app / "command/cmd_receipts.c",
         *sorted(CORE.joinpath("src").rglob("*.c"))],
        ["-ffunction-sections", *(flag for path in includes for flag in ("-I", path))],
        linker_flags=["-Wl,--gc-sections"],
    )
    return target


def test_pending_event_prevents_early_sleep(executable):
    subprocess.run([executable, "event"], check=True, timeout=5)


def test_unsendable_event_respects_awake_limit(executable):
    subprocess.run([executable, "offline"], check=True, timeout=5)


def test_location_in_flight_times_out_and_ignores_late_success(executable):
    subprocess.run([executable, "location-pending"], check=True, timeout=5)


def test_location_result_dispatched_at_deadline_is_a_timeout(executable):
    subprocess.run([executable, "location-ack-first"], check=True, timeout=5)
