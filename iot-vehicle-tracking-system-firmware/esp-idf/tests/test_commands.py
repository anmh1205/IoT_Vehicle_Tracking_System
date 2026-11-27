from pathlib import Path
import subprocess
import tempfile
import unittest

from host_build import CORE, FIRMWARE, build_fixture


class Commands(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        directory = tempfile.TemporaryDirectory()
        cls.addClassCleanup(directory.cleanup)
        cls.executable = Path(directory.name) / "command-fixture"
        components = FIRMWARE / "components"
        includes = [FIRMWARE / "tests" / "stubs", components / "app" / "src",
                    components / "modem" / "src"]
        includes += [components / name / "include" for name in ("storage", "modem", "ota")]
        build_fixture(
            cls.executable,
            [FIRMWARE / "tests" / "command_fixture.c", components / "app" / "src" / "app_cmd.c",
             components / "modem" / "src" / "modem.c", *sorted(CORE.glob("src/**/*.c"))],
            ["-D_POSIX_C_SOURCE=200809L", *(flag for path in includes for flag in ("-I", path))],
        )

    def test_checkpoint_and_deduplication_after_reset(self):
        self.run_case("receipts")

    def test_location_completion_timeout_and_duplicate(self):
        self.run_case("location")

    def test_reboot_waits_for_checkpoint(self):
        self.run_case("reboot")

    def test_rollback_retry_checks_the_original_slot(self):
        self.run_case("rollback")

    def test_command_fifo_overflow_and_disabled_subscription(self):
        self.run_case("fifo")

    def test_json_and_command_validation(self):
        self.run_case("validation")

    def run_case(self, case):
        subprocess.run([self.executable, case], check=True, timeout=5)
