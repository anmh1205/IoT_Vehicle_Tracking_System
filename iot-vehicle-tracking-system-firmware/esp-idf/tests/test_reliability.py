from pathlib import Path
import subprocess
import tempfile
import unittest

from host_build import CORE, FIRMWARE, PLATFORM, build_fixture


class Reliability(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        build = tempfile.TemporaryDirectory()
        cls.addClassCleanup(build.cleanup)
        cls.executable = Path(build.name) / "reliability-fixture"
        components = FIRMWARE / "components"
        storage = components / "storage"
        modem = components / "modem" / "src"
        obd = components / "obd" / "src"
        build_fixture(
            cls.executable,
            [FIRMWARE / "tests" / "reliability_fixture.c", *sorted((storage / "src/queue").glob("*.c")),
             modem / "at/at_parser.c", modem / "at/at_engine.c", modem / "mqtt/mqtt_rx.c", modem / "mqtt/mqtt_session.c",
             obd / "obd_elm327.c", obd / "obd_pid.c",
             components / "app/src/session_tracker.c", components / "app/src/app_clock.c", PLATFORM / "src/platform.c", PLATFORM / "src/platform_rtos.c", *sorted(CORE.joinpath("src").rglob("*.c"))],
            ["-D_POSIX_C_SOURCE=200809L", '-DSD_MOUNT="sd"', "-I", PLATFORM / "include", "-I", FIRMWARE / "tests" / "stubs",
             "-I", storage / "include", "-I", storage / "src", "-I", modem, "-I", obd, "-I", components / "obd" / "include",
             "-I", components / "modem" / "include", "-I", components / "app" / "src",
             "-I", components / "board" / "include", "-ffunction-sections",
             "-Wl,--gc-sections,--wrap=fopen,--wrap=remove,--wrap=truncate,--wrap=fwrite"],
        )

    def run_case(self, case):
        with tempfile.TemporaryDirectory() as directory:
            subprocess.run([self.executable, case], cwd=directory, check=True, timeout=5)

    def test_queue_frame_codec_matches_disk_format(self):
        self.run_case("frame")

    def test_delayed_ack_after_eviction_and_failed_delete(self):
        self.run_case("eviction")

    def test_read_error_keeps_unread_segments(self):
        self.run_case("read_error")

    def test_partial_append_and_failed_truncate(self):
        self.run_case("partial_append")

    def test_sparse_segment_ids_and_backup_file(self):
        self.run_case("sparse")

    def test_uart_framing_and_publish_prompt(self):
        self.run_case("uart")

    def test_ota_confirmation_deadline(self):
        self.run_case("ota")

    def test_late_session_assignment_and_nvs_error(self):
        self.run_case("session")

    def test_mqtt_split_header_and_truncated_payload(self):
        self.run_case("mqtt_rx")

    def test_mqtt_connect_rejects_truncated_credentials(self):
        self.run_case("mqtt_connect")

    def test_obd_notifications_pid_readiness_and_dtc(self):
        self.run_case("obd")
