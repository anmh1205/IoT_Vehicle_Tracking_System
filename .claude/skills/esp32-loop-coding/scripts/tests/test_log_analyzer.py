import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from log_analyzer import analyze_lines


def test_analyze_lines_fatal():
    result = analyze_lines(["I boot ok", "Guru Meditation Error: Core 0 panic'ed"])
    assert result.status == "fatal"
    assert result.fatal_count == 1


def test_analyze_lines_unstable_on_error():
    result = analyze_lines(["I boot ok", "E (11624) MODEM_LTE: timeout"])
    assert result.status == "unstable"
    assert result.error_count == 1


def test_analyze_lines_stable_on_boot_without_error():
    result = analyze_lines(["I (454) main_task: Calling app_main()", "I (464) TRACKER_MAIN: Boot #1"])
    assert result.status == "stable"
    assert result.boot_count >= 1
