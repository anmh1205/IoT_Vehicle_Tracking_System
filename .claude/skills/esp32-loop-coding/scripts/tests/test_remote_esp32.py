import argparse
import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

spec = importlib.util.spec_from_file_location("remote_esp32", ROOT / "remote-esp32.py")
assert spec and spec.loader
remote_esp32 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(remote_esp32)


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
    args = argparse.Namespace(
        host="100.96.198.126",
        user="anmh1",
        key_path="keyfile",
        timeout=15,
        strict_host_key_checking=False,
        dry_run=True,
    )
    result = remote_esp32._run_remote("Write-Output 'ok'", args)
    captured = capsys.readouterr()
    assert result.returncode == 0
    assert "ssh" in captured.out
    assert "powershell" in captured.out
