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
