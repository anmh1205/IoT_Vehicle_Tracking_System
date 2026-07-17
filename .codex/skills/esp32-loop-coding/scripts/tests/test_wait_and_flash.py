import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import wait_and_flash


def test_find_matching_ports_filters_by_port_and_vid_pid(monkeypatch):
    fake_ports = [
        type("P", (), {"device": "COM5", "description": "USB Serial Device", "hwid": "VID:PID=303A:1001", "vid": 0x303A, "pid": 0x1001})(),
        type("P", (), {"device": "COM9", "description": "Other", "hwid": "VID:PID=10C4:EA60", "vid": 0x10C4, "pid": 0xEA60})(),
    ]
    monkeypatch.setattr(wait_and_flash.list_ports, "comports", lambda: fake_ports)
    assert wait_and_flash.find_matching_ports("COM5", 0x303A, 0x1001, "serial") == ["COM5"]


def test_build_esptool_plan_uses_build_metadata(monkeypatch, tmp_path):
    build_dir = tmp_path / "build"
    build_dir.mkdir()
    (build_dir / "flasher_args.json").write_text(
        json.dumps(
            {
                "write_flash_args": ["--flash_mode", "dio"],
                "flash_files": {"0x0": "bootloader.bin", "0x20000": "app.bin"},
                "extra_esptool_args": {"chip": "esp32s3", "before": "default_reset", "after": "hard_reset"},
            }
        ),
        encoding="utf-8",
    )
    (build_dir / "project_description.json").write_text(
        json.dumps({"idf_path": "C:/Espressif/esp-idf-v5.5.3", "target": "esp32s3"}),
        encoding="utf-8",
    )
    monkeypatch.setattr(wait_and_flash, "find_esptool_python", lambda _: "C:/Espressif/python_env/idf/Scripts/python.exe")
    monkeypatch.setattr(wait_and_flash, "find_esptool_script", lambda *_: "C:/Espressif/esp-idf/esptool.py")

    plan = wait_and_flash.build_esptool_plan(tmp_path, 460800, None, None)

    assert plan.mode == "esptool-direct"
    assert plan.cwd == str(build_dir)
    assert plan.argv is not None
    assert "{port}" in plan.argv
    assert "write_flash" in plan.argv


def test_resolve_flash_plan_falls_back_to_command(monkeypatch, tmp_path):
    monkeypatch.setattr(wait_and_flash, "build_esptool_plan", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("missing esptool")))

    plan = wait_and_flash.resolve_flash_plan(
        firmware_dir=tmp_path,
        flash_method="auto",
        export_script="C:\\Espressif\\esp-idf-v5.5.3\\export.ps1",
        flash_command_template="idf.py -p {port} -b {flash_baud} flash",
        flash_baud=921600,
        esptool_python=None,
        esptool_script=None,
    )

    assert plan.mode == "command"
    assert "-b 921600" in plan.display


def test_run_wait_and_flash_returns_ready_without_flash(monkeypatch, tmp_path):
    plan = wait_and_flash.FlashPlan(
        mode="esptool-direct",
        cwd=str(tmp_path),
        display="python esptool.py -p <PORT> write_flash",
        argv=["python", "esptool.py", "-p", "{port}", "write_flash"],
    )
    monkeypatch.setattr(wait_and_flash, "resolve_flash_plan", lambda *args, **kwargs: plan)
    monkeypatch.setattr(wait_and_flash, "wait_for_ready_port", lambda *args, **kwargs: ("COM5", 1, 0.2, ["COM5"], ""))

    result = wait_and_flash.run_wait_and_flash(
        firmware_dir=tmp_path,
        preferred_port="COM5",
        vid=None,
        pid=None,
        description_contains=None,
        baud=115200,
        max_wait_seconds=5,
        probe_interval_ms=100,
        export_script=None,
        flash_command_template="idf.py -p {port} flash",
        flash_method="auto",
        flash_baud=460800,
        esptool_python=None,
        esptool_script=None,
        no_flash=True,
    )

    assert result.status == "ready-no-flash"
    assert result.flash_mode == "esptool-direct"
    assert result.flash_command == "python esptool.py -p COM5 write_flash"


def test_run_wait_and_flash_marks_flash_failure(monkeypatch, tmp_path):
    plan = wait_and_flash.FlashPlan(
        mode="esptool-direct",
        cwd=str(tmp_path),
        display="python esptool.py -p <PORT> write_flash",
        argv=["python", "esptool.py", "-p", "{port}", "write_flash"],
    )
    monkeypatch.setattr(wait_and_flash, "resolve_flash_plan", lambda *args, **kwargs: plan)
    monkeypatch.setattr(wait_and_flash, "wait_for_ready_port", lambda *args, **kwargs: ("COM5", 1, 0.2, ["COM5"], ""))
    monkeypatch.setattr(
        wait_and_flash,
        "run_flash",
        lambda *args, **kwargs: type("Completed", (), {"returncode": 2, "stdout": "flash failed", "stderr": "serial error"})(),
    )

    result = wait_and_flash.run_wait_and_flash(
        firmware_dir=tmp_path,
        preferred_port="COM5",
        vid=None,
        pid=None,
        description_contains=None,
        baud=115200,
        max_wait_seconds=5,
        probe_interval_ms=100,
        export_script=None,
        flash_command_template="idf.py -p {port} flash",
        flash_method="auto",
        flash_baud=460800,
        esptool_python=None,
        esptool_script=None,
        no_flash=False,
    )

    assert result.status == "flash-failed"
    assert result.flash_mode == "esptool-direct"
    assert result.flash_exit_code == 2
    assert result.flash_stdout_tail[-1] == "flash failed"
    assert result.flash_stderr_tail[-1] == "serial error"
