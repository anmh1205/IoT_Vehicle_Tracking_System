#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import subprocess
import sys
import time
from dataclasses import asdict, dataclass
from pathlib import Path, PureWindowsPath

from env_loader import load_skill_env

TRANSIENT_FLASH_ERRORS = (
    "no serial data received",
    "permissionerror",
    "device attached to the system is not functioning",
    "could not open port",
    "access is denied",
    "failed to connect",
)


@dataclass
class RemoteFlashResult:
    status: str
    port: str | None
    attempts: int
    elapsed_seconds: float
    candidate_ports: list[str]
    last_error: str
    flash_exit_code: int | None


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _bool_env(name: str, default: bool) -> bool:
    value = _env(name)
    return default if not value else value.lower() in {"1", "true", "yes", "on"}


def _quote_ps(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def _encode_ps(script: str) -> str:
    return base64.b64encode(script.encode("utf-16le")).decode()


def _encode_py(script: str) -> str:
    return base64.b64encode(script.encode("utf-8")).decode()


def _marker(port: str, event: str, detail: str = "") -> str:
    suffix = f" detail={detail}" if detail else ""
    return f"===== serial {event} port={port} ts={int(time.time())}{suffix} ====="


def _ssh_args(host: str, user: str, key_path: str, timeout: int, strict: bool) -> list[str]:
    args = [
        "ssh", "-i", key_path, "-o", "BatchMode=yes", "-o", "PreferredAuthentications=publickey",
        "-o", "PubkeyAuthentication=yes", "-o", "PasswordAuthentication=no",
        "-o", "KbdInteractiveAuthentication=no", "-o", "IdentitiesOnly=yes",
        "-o", f"ConnectTimeout={max(1, timeout)}", "-o", "LogLevel=ERROR",
    ]
    if not strict:
        args.extend(["-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null"])
    args.append(f"{user}@{host}")
    return args


def _run_remote(
    script: str,
    args: argparse.Namespace,
    command_timeout_seconds: float | None = None,
) -> subprocess.CompletedProcess[str]:
    command = [
        *_ssh_args(args.host, args.user, args.key_path, args.timeout, args.strict_host_key_checking),
        "powershell", "-NoProfile", "-NonInteractive", "-EncodedCommand", _encode_ps(script),
    ]
    if args.dry_run:
        print(json.dumps(command, ensure_ascii=False, indent=2))
        return subprocess.CompletedProcess(command, 0, "", "")
    try:
        return subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False,
            timeout=command_timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        stderr = f"remote command timed out after {command_timeout_seconds}s"
        if exc.stderr:
            stderr = f"{stderr}\n{exc.stderr}"
        return subprocess.CompletedProcess(command, 124, exc.stdout or "", stderr)


def _remote_python_command(script: str, args: argparse.Namespace) -> list[str]:
    encoded = _encode_py(script)
    bootstrap = f"import base64;exec(base64.b64decode('{encoded}').decode('utf-8'))"
    remote_cmd = f'cmd /d /s /c ""{args.remote_python}" -c "{bootstrap}""'
    return [*_ssh_args(args.host, args.user, args.key_path, args.timeout, args.strict_host_key_checking), remote_cmd]


def _run_remote_python(
    script: str,
    args: argparse.Namespace,
    command_timeout_seconds: float | None = None,
) -> subprocess.CompletedProcess[str]:
    command = _remote_python_command(script, args)
    if args.dry_run:
        print(json.dumps(command, ensure_ascii=False, indent=2))
        return subprocess.CompletedProcess(command, 0, "", "")
    try:
        return subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=False,
            timeout=command_timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        stderr = f"remote python timed out after {command_timeout_seconds}s"
        if exc.stderr:
            stderr = f"{stderr}\n{exc.stderr}"
        return subprocess.CompletedProcess(command, 124, exc.stdout or "", stderr)


def _dry_run_process(command: list[str]) -> subprocess.Popen[str]:
    if command:
        print(json.dumps(command, ensure_ascii=False, indent=2))
    return subprocess.Popen(
        ["python", "-c", "import sys; sys.exit(0)"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )


def _spawn_remote_python(script: str, args: argparse.Namespace) -> subprocess.Popen[str]:
    command = _remote_python_command(script, args)
    if args.dry_run:
        return _dry_run_process(command)
    return subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
    )


def _print_result(result: subprocess.CompletedProcess[str]) -> int:
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    return result.returncode


def _parse_port_details(raw: str, preferred_vid: str, preferred_pid: str) -> list[dict[str, str]]:
    data = json.loads(raw) if raw.strip() else []
    if isinstance(data, dict):
        data = [data]
    preferred_vid = preferred_vid.lower().replace("0x", "")
    preferred_pid = preferred_pid.lower().replace("0x", "")
    def rank(item: dict[str, str]) -> tuple[int, int, str]:
        pnp = str(item.get("PNPDeviceID", "")).lower()
        return (0 if preferred_vid in pnp and preferred_pid in pnp else 1, 0 if "usb\\" in pnp else 1, str(item.get("DeviceID", "")))
    return sorted(data, key=rank)


def _detect_remote_ports(args: argparse.Namespace, preferred_vid: str, preferred_pid: str) -> list[dict[str, str]]:
    script = "$ProgressPreference='SilentlyContinue';Get-CimInstance Win32_SerialPort | Select-Object DeviceID,Name,Description,PNPDeviceID | ConvertTo-Json -Compress\n"
    result = _run_remote(script, args, command_timeout_seconds=args.command_timeout_seconds)
    if result.returncode != 0:
        py_script = (
            "import json\nfrom serial.tools import list_ports\n"
            "print(json.dumps([{'DeviceID':p.device,'Name':p.description or p.name or p.device,"
            "'Description':p.description or '','PNPDeviceID':p.hwid or ''} for p in list_ports.comports()],separators=(',',':')))"
        )
        result = _run_remote_python(py_script, args, command_timeout_seconds=args.command_timeout_seconds)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip() or "remote detect failed")
    return _parse_port_details(result.stdout, preferred_vid, preferred_pid)


def _probe_remote_port(port: str, baud: int, args: argparse.Namespace) -> tuple[bool, str]:
    py_script = (
        "import json,serial\n"
        f"port={port!r};baud={baud!r}\n"
        "try:\n"
        " s=serial.Serial();s.port=port;s.baudrate=baud;s.timeout=0.2;s.dsrdtr=False;s.rtscts=False;s.dtr=False;s.rts=False;s.open();s.close();\n"
        " print(json.dumps({'ok':True,'error':''},separators=(',',':')))\n"
        "except Exception as exc:\n"
        " print(json.dumps({'ok':False,'error':str(exc)},separators=(',',':')))\n"
    )
    result = _run_remote_python(py_script, args, command_timeout_seconds=args.command_timeout_seconds)
    if result.returncode != 0:
        return False, result.stderr.strip() or result.stdout.strip() or "remote probe failed"
    try:
        payload = json.loads(result.stdout.strip() or "{}")
    except json.JSONDecodeError:
        return False, result.stdout.strip() or "remote probe returned invalid json"
    return bool(payload.get("ok")), str(payload.get("error") or "")


def _candidate_ports(details: list[dict[str, str]], preferred_port: str | None) -> list[str]:
    if preferred_port:
        chosen = [str(item.get("DeviceID", "")) for item in details if str(item.get("DeviceID", "")).upper() == preferred_port.upper()]
        return [port for port in chosen if port]
    return [str(item.get("DeviceID", "")) for item in details if item.get("DeviceID")]


def _wait_for_port(args: argparse.Namespace, max_wait_seconds: int, probe_baud: int) -> tuple[str | None, int, float, list[str], str]:
    start = time.monotonic()
    attempts = 0
    last_error = ""
    candidate_ports: list[str] = []
    while time.monotonic() - start < max_wait_seconds:
        attempts += 1
        try:
            details = _detect_remote_ports(args, args.preferred_vid, args.preferred_pid)
            candidate_ports = _candidate_ports(details, args.port)
            if not candidate_ports:
                last_error = "port not enumerated"
            for port in candidate_ports:
                ok, error = _probe_remote_port(port, probe_baud, args)
                if ok:
                    return port, attempts, round(time.monotonic() - start, 2), candidate_ports, last_error
                last_error = error or last_error
        except RuntimeError as exc:
            last_error = str(exc)
        time.sleep(max(args.probe_interval_ms, 100) / 1000.0)
    return None, attempts, round(time.monotonic() - start, 2), candidate_ports, last_error


def _is_transient_flash_error(result: subprocess.CompletedProcess[str]) -> bool:
    text = f"{result.stdout}\n{result.stderr}".lower()
    return any(pattern in text for pattern in TRANSIENT_FLASH_ERRORS)


def _build_esptool_args(args: argparse.Namespace, port: str) -> list[str]:
    flasher_args = json.loads(Path(args.flasher_args).read_text(encoding="utf-8"))
    extra = flasher_args.get("extra_esptool_args", {})
    flash_items: list[str] = []
    for offset, file_name in flasher_args.get("flash_files", {}).items():
        flash_items.extend([str(offset), str(PureWindowsPath(args.stage_dir) / file_name)])
    return [
        "--chip", str(extra.get("chip") or args.chip), "-p", port, "-b", str(args.flash_baud),
        "--before", str(extra.get("before") or "default_reset"),
        "--after", str(extra.get("after") or "hard_reset"), "write_flash",
        *[str(item) for item in flasher_args.get("write_flash_args", [])], *flash_items,
    ]


def _flash_once(port: str, args: argparse.Namespace) -> subprocess.CompletedProcess[str]:
    ps_array = ", ".join(_quote_ps(item) for item in _build_esptool_args(args, port))
    script = (
        f"$ProgressPreference='SilentlyContinue';$py={_quote_ps(args.remote_python)};"
        f"$tool={_quote_ps(args.remote_esptool)};$args=@({ps_array});& $py $tool @args;exit $LASTEXITCODE"
    )
    result = _run_remote(script, args, command_timeout_seconds=args.flash_command_timeout_seconds)
    if result.returncode == 0:
        return result
    py_script = (
        "import subprocess,sys\n"
        f"argv={json.dumps([args.remote_esptool, *_build_esptool_args(args, port)])}\n"
        "raise SystemExit(subprocess.run([sys.executable,*argv],check=False).returncode)\n"
    )
    return _run_remote_python(py_script, args, command_timeout_seconds=args.flash_command_timeout_seconds)


def cmd_detect(args: argparse.Namespace) -> int:
    try:
        details = _detect_remote_ports(args, args.preferred_vid, args.preferred_pid)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(details, ensure_ascii=False, indent=2))
    else:
        for item in details:
            print(f"{item.get('DeviceID','')} | {item.get('Name','')} | {item.get('PNPDeviceID','')}")
    return 0


def cmd_monitor(args: argparse.Namespace) -> int:
    if args.dry_run:
        py_script = (
            "import serial,time\n"
            f"port={args.port!r};baud={args.baud!r};seconds={float(args.seconds)!r}\n"
            "end=time.monotonic()+seconds\n"
            "s=serial.Serial();s.port=port;s.baudrate=baud;s.timeout=0.2;s.dsrdtr=False;s.rtscts=False;s.dtr=False;s.rts=False;s.open()\n"
            "try:\n"
            " while time.monotonic()<end:\n"
            "  data=s.readline()\n"
            "  if data:\n"
            "   print(data.decode(errors='replace').rstrip('\\r\\n'), flush=True)\n"
            "finally:\n"
            " s.close()\n"
        )
        print(json.dumps(_remote_python_command(py_script, args), ensure_ascii=False, indent=2))
        return 0
    deadline = time.monotonic() + args.seconds
    ever_connected = False
    last_error = ""
    print(f"===== monitor start port={args.port} ts={int(time.time())} =====", flush=True)
    while time.monotonic() < deadline:
        ok, error = _probe_remote_port(args.port, args.baud, args)
        if not ok:
            if error != last_error:
                print(_marker(args.port, "unavailable", error or "probe failed"), flush=True)
                last_error = error
            time.sleep(max(args.probe_interval_ms, 100) / 1000.0)
            continue
        print(_marker(args.port, "reconnect" if ever_connected else "open"), flush=True)
        ever_connected = True
        last_error = ""
        py_script = (
            "import serial,sys,time\n"
            f"port={args.port!r};baud={args.baud!r};seconds={max(deadline - time.monotonic(), 0.2)!r}\n"
            "end=time.monotonic()+seconds\n"
            "s=serial.Serial();s.port=port;s.baudrate=baud;s.timeout=0.2;s.dsrdtr=False;s.rtscts=False;s.dtr=False;s.rts=False;s.open()\n"
            "try:\n"
            " while time.monotonic()<end:\n"
            "  try:\n"
            "   data=s.readline()\n"
            "  except Exception as exc:\n"
            "   print(str(exc), file=sys.stderr, flush=True); raise SystemExit(13)\n"
            "  if data:\n"
            "   print(data.decode(errors='replace').rstrip('\\r\\n'), flush=True)\n"
            "finally:\n"
            " s.close()\n"
        )
        proc = _spawn_remote_python(py_script, args)
        assert proc.stdout and proc.stderr
        for line in proc.stdout:
            print(line, end="")
        stderr = proc.stderr.read().strip()
        code = proc.wait()
        if code != 0 and time.monotonic() < deadline:
            print(_marker(args.port, "disconnect", stderr or f"exit={code}"), flush=True)
            time.sleep(max(args.probe_interval_ms, 100) / 1000.0)
    return 0 if ever_connected else 2


def _run_wait_flash(args: argparse.Namespace, emit_output: bool) -> RemoteFlashResult:
    start = time.monotonic()
    attempts = 0
    last_error = ""
    candidate_ports: list[str] = []
    while time.monotonic() - start < args.max_wait_seconds:
        remaining = max(int(args.max_wait_seconds - (time.monotonic() - start)), 1)
        port, tries, _, candidate_ports, last_error = _wait_for_port(args, remaining, args.baud)
        attempts += tries
        if not port:
            break
        result = _flash_once(port, args)
        if emit_output:
            _print_result(result)
        if result.returncode == 0:
            return RemoteFlashResult("flash-ok", port, attempts, round(time.monotonic() - start, 2), candidate_ports, last_error, 0)
        last_error = (result.stderr or result.stdout or "").strip() or last_error
        if not args.wait_for_port or not _is_transient_flash_error(result):
            return RemoteFlashResult("flash-failed", port, attempts, round(time.monotonic() - start, 2), candidate_ports, last_error, result.returncode)
        print(_marker(port, "disconnect", "flash retry after transient usb failure"), flush=True)
        time.sleep(max(args.probe_interval_ms, 100) / 1000.0)
    return RemoteFlashResult("timeout", None, attempts, round(time.monotonic() - start, 2), candidate_ports, last_error, None)


def cmd_flash(args: argparse.Namespace) -> int:
    emit_output = not args.json
    result = _run_wait_flash(args, emit_output) if args.wait_for_port else RemoteFlashResult("timeout", None, 0, 0.0, [], "", None)
    if not args.wait_for_port:
        immediate = _flash_once(args.port, args)
        if emit_output:
            _print_result(immediate)
        result = RemoteFlashResult("flash-ok" if immediate.returncode == 0 else "flash-failed", args.port, 1, 0.0, [args.port], "", immediate.returncode)
    if args.json:
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    return 0 if result.status == "flash-ok" else 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Remote ESP32 helpers over SSH")
    parser.add_argument("--host", default=_env("ESP32_REMOTE_HOST", "100.96.198.126"))
    parser.add_argument("--user", default=_env("ESP32_REMOTE_USER", "anmh1"))
    parser.add_argument("--key-path", default=_env("ESP32_REMOTE_KEY_PATH"))
    parser.add_argument("--timeout", type=int, default=int(_env("ESP32_REMOTE_TIMEOUT_SECONDS", "15") or "15"))
    parser.add_argument("--strict-host-key-checking", action="store_true", default=_bool_env("ESP32_REMOTE_STRICT_HOST_KEY_CHECKING", False))
    parser.add_argument("--remote-python", default=_env("ESP32_REMOTE_PYTHON", r"D:\ESP_IDF\Espressif\python_env\idf5.5_py3.11_env\Scripts\python.exe"))
    parser.add_argument("--command-timeout-seconds", type=float, default=float(_env("ESP32_REMOTE_COMMAND_TIMEOUT_SECONDS", "4") or "4"))
    parser.add_argument("--flash-command-timeout-seconds", type=float, default=float(_env("ESP32_REMOTE_FLASH_COMMAND_TIMEOUT_SECONDS", "180") or "180"))
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
    monitor.add_argument("--probe-interval-ms", type=int, default=int(_env("ESP32_WAIT_FLASH_PROBE_INTERVAL_MS", "500") or "500"))
    monitor.set_defaults(func=cmd_monitor)

    flash = sub.add_parser("flash")
    flash.add_argument("--port", required=True)
    flash.add_argument("--flasher-args", required=True)
    flash.add_argument("--stage-dir", default=_env("ESP32_REMOTE_STAGE_DIR", r"C:\Users\anmh1\esp32-remote-flash"))
    flash.add_argument("--flash-baud", type=int, default=int(_env("ESP32_FLASH_BAUD", "460800") or "460800"))
    flash.add_argument("--baud", type=int, default=int(_env("ESP32_BAUD", "115200") or "115200"))
    flash.add_argument("--max-wait-seconds", type=int, default=int(_env("ESP32_WAIT_FLASH_MAX_WAIT_SECONDS", "600") or "600"))
    flash.add_argument("--probe-interval-ms", type=int, default=int(_env("ESP32_WAIT_FLASH_PROBE_INTERVAL_MS", "500") or "500"))
    flash.add_argument("--preferred-vid", default=_env("ESP32_REMOTE_PREFERRED_VID", "0x303A"))
    flash.add_argument("--preferred-pid", default=_env("ESP32_REMOTE_PREFERRED_PID", "0x1001"))
    flash.add_argument("--chip", default="esp32s3")
    flash.add_argument("--remote-esptool", default=_env("ESP32_REMOTE_ESPTOOL", r"D:\ESP_IDF\esp\v5.5.1\esp-idf\components\esptool_py\esptool\esptool.py"))
    flash.add_argument("--no-wait", dest="wait_for_port", action="store_false")
    flash.add_argument("--json", action="store_true")
    flash.set_defaults(func=cmd_flash, wait_for_port=True)
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
