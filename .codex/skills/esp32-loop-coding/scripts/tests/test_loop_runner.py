import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import loop_runner


def test_build_log_file_path_from_com():
    path = loop_runner.build_log_file_path(Path("iot-vehicle-tracking-system-firmware"), "COM6")
    normalized = str(path).replace("\\", "/")
    assert normalized.endswith("documents/test-logs/com6-monitor-latest.log")


def test_resolve_port_prefers_input():
    assert loop_runner.resolve_port("COM9") == "COM9"


def test_run_loop_breaks_on_unstable_without_build(monkeypatch, tmp_path):
    firmware_dir = tmp_path / "fw"
    (firmware_dir / "documents" / "test-logs").mkdir(parents=True)

    monkeypatch.setattr(loop_runner, "resolve_port", lambda preferred_port=None: "COM6")

    class FakeReadResult:
        status = "unstable"

    monkeypatch.setattr(loop_runner, "read_serial", lambda **kwargs: FakeReadResult())
    monkeypatch.setattr(
        loop_runner,
        "analyze_lines",
        lambda lines: type("R", (), {"status": "unstable"})(),
    )

    result = loop_runner.run_loop(
        firmware_dir=firmware_dir,
        preferred_port=None,
        max_iterations=2,
        baud=115200,
        max_seconds=1,
        stable_seconds=1,
        quiet_seconds=1,
    )

    assert result.final_status == "unstable"
    assert len(result.iterations) == 1
    assert result.iterations[0].action == "needs-code-fix-and-manual-build-flash"


def test_has_valid_gnss_fix_with_success_log_line():
    lines = [
        "I (100) MODEM_GNSS: GNSS fix success lat=10.762622 lon=106.660172 sat=8 streak=1",
    ]
    assert loop_runner._has_valid_gnss_fix(lines)


def test_run_loop_requires_gnss_streak_before_stop(monkeypatch, tmp_path):
    firmware_dir = tmp_path / "fw"
    log_dir = firmware_dir / "documents" / "test-logs"
    log_dir.mkdir(parents=True)
    log_file = log_dir / "com6-monitor-latest.log"

    monkeypatch.setattr(loop_runner, "resolve_port", lambda preferred_port=None: "COM6")

    statuses = iter(["stable", "stable", "stable"])

    class FakeReadResult:
        def __init__(self, status: str):
            self.status = status

    def fake_read_serial(**kwargs):
        status = next(statuses)
        if status == "stable":
            if "GNSS_FIX_OK" not in log_file.read_text(encoding="utf-8", errors="replace"):
                log_file.write_text("boot ok\n", encoding="utf-8")
            else:
                with log_file.open("a", encoding="utf-8") as out:
                    out.write("GNSS_FIX_OK\n")
        return FakeReadResult(status)

    monkeypatch.setattr(loop_runner, "read_serial", fake_read_serial)
    monkeypatch.setattr(
        loop_runner,
        "analyze_lines",
        lambda lines: type("R", (), {"status": "stable"})(),
    )
    monkeypatch.setattr(loop_runner, "_has_valid_gnss_fix", lambda lines: "GNSS_FIX_OK" in lines)

    with log_file.open("w", encoding="utf-8") as out:
        out.write("GNSS_FIX_OK\n")

    result = loop_runner.run_loop(
        firmware_dir=firmware_dir,
        preferred_port=None,
        max_iterations=3,
        baud=115200,
        max_seconds=1,
        stable_seconds=1,
        quiet_seconds=1,
        gnss_streak_target=2,
    )

    assert result.final_status == "stable"
    assert len(result.iterations) == 2
    assert result.iterations[0].status == "stable-no-gnss"
    assert result.iterations[1].action == "stop-gnss-ok"
