#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
from pathlib import Path, PureWindowsPath

from env_loader import load_skill_env


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _bool_env(name: str, default: bool) -> bool:
    value = _env(name)
    if not value:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _quote_ps(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _encode_ps(script: str) -> str:
    return base64.b64encode(script.encode("utf-16le")).decode()


def _ssh_args(host: str, user: str, key_path: str, timeout: int, strict: bool) -> list[str]:
    args = [
        "ssh",
        "-i",
        key_path,
        "-o",
        "BatchMode=yes",
        "-o",
        "PreferredAuthentications=publickey",
        "-o",
        "PubkeyAuthentication=yes",
        "-o",
        "PasswordAuthentication=no",
        "-o",
        "KbdInteractiveAuthentication=no",
        "-o",
        "IdentitiesOnly=yes",
        "-o",
        f"ConnectTimeout={max(1, timeout)}",
    ]
    if not strict:
        args.extend(["-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null"])
    args.append(f"{user}@{host}")
    return args


def _run_remote(script: str, args: argparse.Namespace) -> subprocess.CompletedProcess[str]:
    command = [
        *_ssh_args(args.host, args.user, args.key_path, args.timeout, args.strict_host_key_checking),
        "powershell",
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        _encode_ps(script),
    ]
    if args.dry_run:
        print(json.dumps(command, ensure_ascii=False, indent=2))
        return subprocess.CompletedProcess(command, 0, "", "")
    return subprocess.run(command, capture_output=True, text=True, check=False)


def _print_result(result: subprocess.CompletedProcess[str]) -> int:
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=os.sys.stderr)
    return result.returncode


def _parse_port_details(raw: str, preferred_vid: str, preferred_pid: str) -> list[dict[str, str]]:
    data = json.loads(raw) if raw.strip() else []
    if isinstance(data, dict):
        data = [data]
    preferred_vid = preferred_vid.lower().replace("0x", "")
    preferred_pid = preferred_pid.lower().replace("0x", "")
    def rank(item: dict[str, str]) -> tuple[int, str]:
        pnp = str(item.get("PNPDeviceID", "")).lower()
        usb_rank = 0 if "usb\\" in pnp else 1
        preferred_rank = 0 if preferred_vid in pnp and preferred_pid in pnp else 1
        return (preferred_rank, usb_rank, str(item.get("DeviceID", "")))
    return sorted(data, key=rank)


def cmd_detect(args: argparse.Namespace) -> int:
    script = """$ProgressPreference = 'SilentlyContinue'\nGet-CimInstance Win32_SerialPort | Select-Object DeviceID,Name,Description,PNPDeviceID | ConvertTo-Json -Compress\n"""
    result = _run_remote(script, args)
    if result.returncode != 0:
        return _print_result(result)
    details = _parse_port_details(result.stdout, args.preferred_vid, args.preferred_pid)
    if args.json:
        print(json.dumps(details, ensure_ascii=False, indent=2))
    else:
        for item in details:
            print(f"{item.get('DeviceID','')} | {item.get('Name','')} | {item.get('PNPDeviceID','')}")
    return 0


def cmd_monitor(args: argparse.Namespace) -> int:
    script = f"""$ProgressPreference = 'SilentlyContinue'\n$port={_quote_ps(args.port)}\n$baud={args.baud}\n$sp=[System.IO.Ports.SerialPort]::new($port,$baud)\n$sp.NewLine=[System.Environment]::NewLine\n$sp.ReadTimeout=500\n$sp.Open()\ntry {{\n  $end=(Get-Date).AddSeconds({args.seconds})\n  while((Get-Date) -lt $end) {{\n    try {{\n      $line=$sp.ReadLine()\n      if ($line) {{ Write-Output $line.TrimEnd() }}\n    }} catch [System.TimeoutException] {{}}\n  }}\n}} finally {{\n  if ($sp -and $sp.IsOpen) {{ $sp.Close() }}\n}}\n"""
    return _print_result(_run_remote(script, args))


def cmd_flash(args: argparse.Namespace) -> int:
    flasher_args = json.loads(Path(args.flasher_args).read_text(encoding="utf-8"))
    extra = flasher_args.get("extra_esptool_args", {})
    chip = str(extra.get("chip") or args.chip)
    flash_items: list[str] = []
    for offset, file_name in flasher_args.get("flash_files", {}).items():
        flash_items.extend([str(offset), str(PureWindowsPath(args.stage_dir) / file_name)])
    esptool_args = [
        "--chip", chip,
        "-p", args.port,
        "-b", str(args.flash_baud),
        "--before", str(extra.get("before") or "default_reset"),
        "--after", str(extra.get("after") or "hard_reset"),
        "write_flash",
        *[str(item) for item in flasher_args.get("write_flash_args", [])],
        *flash_items,
    ]
    ps_array = ", ".join(_quote_ps(item) for item in esptool_args)
    script = f"""$ProgressPreference = 'SilentlyContinue'\n$py={_quote_ps(args.remote_python)}\n$tool={_quote_ps(args.remote_esptool)}\n$args=@({ps_array})\n& $py $tool @args\nexit $LASTEXITCODE\n"""
    return _print_result(_run_remote(script, args))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Remote ESP32 helpers over SSH")
    parser.add_argument("--host", default=_env("ESP32_REMOTE_HOST", "100.96.198.126"))
    parser.add_argument("--user", default=_env("ESP32_REMOTE_USER", "anmh1"))
    parser.add_argument("--key-path", default=_env("ESP32_REMOTE_KEY_PATH"))
    parser.add_argument("--timeout", type=int, default=int(_env("ESP32_REMOTE_TIMEOUT_SECONDS", "15") or "15"))
    parser.add_argument("--strict-host-key-checking", action="store_true", default=_bool_env("ESP32_REMOTE_STRICT_HOST_KEY_CHECKING", False))
    parser.add_argument("--dry-run", action="store_true")
    sub = parser.add_subparsers(dest="command", required=True)

    detect = sub.add_parser("detect")
    detect.add_argument("--preferred-vid", default=_env("ESP32_REMOTE_PREFERRED_VID", "0x303A"))
    detect.add_argument("--preferred-pid", default=_env("ESP32_REMOTE_PREFERRED_PID", "0x1001"))
    detect.add_argument("--json", action="store_true")
    detect.set_defaults(func=cmd_detect)

    monitor = sub.add_parser("monitor")
    monitor.add_argument("--port", required=True)
    monitor.add_argument("--baud", type=int, default=int(_env("ESP32_BAUD", "115200") or "115200"))
    monitor.add_argument("--seconds", type=int, default=int(_env("ESP32_MAX_SECONDS", "120") or "120"))
    monitor.set_defaults(func=cmd_monitor)

    flash = sub.add_parser("flash")
    flash.add_argument("--port", required=True)
    flash.add_argument("--flasher-args", required=True)
    flash.add_argument("--stage-dir", default=_env("ESP32_REMOTE_STAGE_DIR", r"C:\Users\anmh1\esp32-remote-flash"))
    flash.add_argument("--flash-baud", type=int, default=int(_env("ESP32_FLASH_BAUD", "460800") or "460800"))
    flash.add_argument("--chip", default="esp32s3")
    flash.add_argument("--remote-python", default=_env("ESP32_REMOTE_PYTHON", r"D:\ESP_IDF\Espressif\python_env\idf5.5_py3.11_env\Scripts\python.exe"))
    flash.add_argument("--remote-esptool", default=_env("ESP32_REMOTE_ESPTOOL", r"D:\ESP_IDF\esp\v5.5.1\esp-idf\components\esptool_py\esptool\esptool.py"))
    flash.set_defaults(func=cmd_flash)
    return parser


def main() -> int:
    load_skill_env("esp32-loop-coding")
    parser = build_parser()
    args = parser.parse_args()
    if not args.key_path:
        parser.error("Missing --key-path or ESP32_REMOTE_KEY_PATH")
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
