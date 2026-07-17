import argparse
import importlib.util
import io
import json
import subprocess
import sys
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

spec = importlib.util.spec_from_file_location("remote_esp32", ROOT / "remote-esp32.py")
assert spec and spec.loader
remote_esp32 = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = remote_esp32
spec.loader.exec_module(remote_esp32)


def make_args(**overrides):
    base = dict(
        host="100.96.198.126",
        user="anmh1",
        key_path="keyfile",
        timeout=15,
        strict_host_key_checking=False,
        dry_run=False,
        remote_python="python.exe",
        remote_esptool="esptool.py",
        command_timeout_seconds=4.0,
        flash_command_timeout_seconds=180.0,
        preferred_vid="0x303A",
        preferred_pid="0x1001",
        port="COM13",
        probe_interval_ms=10,
        baud=115200,
        flash_baud=460800,
        flasher_args=str(ROOT / "tests" / "fixtures" / "flasher_args.json"),
        stage_dir=r"C:\stage",
        chip="esp32s3",
        max_wait_seconds=5,
        wait_for_port=True,
        json=False,
        seconds=1,
    )
    base.update(overrides)
    return argparse.Namespace(**base)


def test_parse_port_details_prefers_esp32_usb_vid_pid():
    raw = json.dumps([
        {"DeviceID": "COM4", "Name": "Bluetooth", "PNPDeviceID": "BTHENUM\\X"},
        {"DeviceID": "COM13", "Name": "USB Serial Device (COM13)", "PNPDeviceID": "USB\\VID_303A&PID_1001&MI_00\\ABC"},
    ])
    items = remote_esp32._parse_port_details(raw, "0x303A", "0x1001")
    assert items[0]["DeviceID"] == "COM13"


def test_encode_ps_returns_base64_string():
    encoded = remote_esp32._encode_ps("Write-Output 'ok'")
    assert isinstance(encoded, str)
    assert encoded


def test_quote_ps_escapes_single_quotes():
    assert remote_esp32._quote_ps("D:'test'") == "'D:''test'''"


def test_ssh_args_disable_host_key_checks_when_requested():
    args = remote_esp32._ssh_args("100.96.198.126", "anmh1", "keyfile", 15, False)
    assert "StrictHostKeyChecking=no" in args
    assert "UserKnownHostsFile=/dev/null" in args
    assert args[-1] == "anmh1@100.96.198.126"


def test_run_remote_dry_run_returns_success(capsys):
    args = make_args(dry_run=True)
    result = remote_esp32._run_remote("Write-Output 'ok'", args)
    captured = capsys.readouterr()
    assert result.returncode == 0
    assert "ssh" in captured.out
    assert "powershell" in captured.out


def test_run_remote_returns_timeout_completed_process(monkeypatch):
    args = make_args()

    def raise_timeout(*_a, **_k):
        raise subprocess.TimeoutExpired(cmd="ssh", timeout=4)

    monkeypatch.setattr(remote_esp32.subprocess, "run", raise_timeout)
    result = remote_esp32._run_remote("Write-Output 'ok'", args, command_timeout_seconds=4)
    assert result.returncode == 124
    assert "timed out" in result.stderr


def test_is_transient_flash_error_matches_native_usb_failures():
    result = subprocess.CompletedProcess(
        args=[],
        returncode=2,
        stdout="",
        stderr="PermissionError(13, 'A device attached to the system is not functioning.', None, 31)",
    )
    assert remote_esp32._is_transient_flash_error(result)


def test_run_wait_flash_retries_after_transient_error(monkeypatch):
    args = make_args()
    monkeypatch.setattr(remote_esp32, "_wait_for_port", lambda *a, **k: ("COM13", 1, 0.1, ["COM13"], ""))
    state = {"calls": 0}

    def flash_once(port, _args):
        state["calls"] += 1
        if state["calls"] == 1:
            return subprocess.CompletedProcess([], 2, "", "Failed to connect to ESP32-S3: No serial data received")
        return subprocess.CompletedProcess([], 0, "ok", "")

    monkeypatch.setattr(remote_esp32, "_flash_once", flash_once)
    monkeypatch.setattr(remote_esp32.time, "sleep", lambda *_: None)
    out = io.StringIO()
    with redirect_stdout(out):
        result = remote_esp32._run_wait_flash(args, emit_output=False)
    assert result.status == "flash-ok"
    assert result.port == "COM13"
    assert state["calls"] == 2
    assert "flash retry after transient usb failure" in out.getvalue()


def test_run_wait_flash_stops_on_non_transient_error(monkeypatch):
    args = make_args()
    monkeypatch.setattr(remote_esp32, "_wait_for_port", lambda *a, **k: ("COM13", 1, 0.1, ["COM13"], ""))
    monkeypatch.setattr(
        remote_esp32,
        "_flash_once",
        lambda *a, **k: subprocess.CompletedProcess([], 2, "", "fatal: bad image"),
    )
    result = remote_esp32._run_wait_flash(args, emit_output=False)
    assert result.status == "flash-failed"
    assert result.flash_exit_code == 2


def test_cmd_monitor_dry_run_prints_remote_python_command(capsys):
    args = make_args(dry_run=True, seconds=30)
    exit_code = remote_esp32.cmd_monitor(args)
    captured = capsys.readouterr()
    assert exit_code == 0
    assert "ssh" in captured.out
    assert "python.exe" in captured.out


def test_cmd_flash_json_suppresses_raw_flash_output(monkeypatch, capsys):
    args = make_args(json=True)
    monkeypatch.setattr(
        remote_esp32,
        "_run_wait_flash",
        lambda *_a, **_k: remote_esp32.RemoteFlashResult(
            status="flash-ok",
            port="COM13",
            attempts=2,
            elapsed_seconds=1.2,
            candidate_ports=["COM13"],
            last_error="",
            flash_exit_code=0,
        ),
    )
    exit_code = remote_esp32.cmd_flash(args)
    captured = capsys.readouterr()
    payload = json.loads(captured.out)
    assert exit_code == 0
    assert payload["status"] == "flash-ok"
    assert captured.out.strip().startswith("{")
