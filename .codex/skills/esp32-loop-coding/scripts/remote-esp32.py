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


def _scp_args(host: str, user: str, key_path: str, timeout: int, strict: bool) -> list[str]:
    args = [
        "scp", "-i", key_path, "-o", "BatchMode=yes", "-o", "PreferredAuthentications=publickey",
        "-o", "PubkeyAuthentication=yes", "-o", "PasswordAuthentication=no",
        "-o", "KbdInteractiveAuthentication=no", "-o", "IdentitiesOnly=yes",
        "-o", f"ConnectTimeout={max(1, timeout)}", "-o", "LogLevel=ERROR",
    ]
    if not strict:
        args.extend(["-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null"])
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


def _remote_scp_path(path: PureWindowsPath) -> str:
    value = path.as_posix()
    return value if value.startswith("/") else f"/{value}"


def _resolve_local_flash_files(args: argparse.Namespace) -> list[tuple[Path, PureWindowsPath]]:
    flasher_path = Path(args.flasher_args).resolve()
    data = json.loads(flasher_path.read_text(encoding="utf-8"))
    stage_root = PureWindowsPath(args.stage_dir)
    pairs: list[tuple[Path, PureWindowsPath]] = [(flasher_path, stage_root / flasher_path.name)]
    seen = {str(flasher_path)}
    for file_name in data.get("flash_files", {}).values():
        local_path = (flasher_path.parent / str(file_name)).resolve()
        key = str(local_path)
        if key in seen:
            continue
        seen.add(key)
        pairs.append((local_path, stage_root / PureWindowsPath(str(file_name))))
    return pairs


def _run_scp(local_path: Path, remote_path: PureWindowsPath, args: argparse.Namespace) -> subprocess.CompletedProcess[str]:
    command = [
        *_scp_args(args.host, args.user, args.key_path, args.timeout, args.strict_host_key_checking),
        str(local_path),
        f"{args.user}@{args.host}:{_remote_scp_path(remote_path)}",
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
            timeout=args.flash_command_timeout_seconds,
        )
    except subprocess.TimeoutExpired as exc:
        stderr = f"scp timed out after {args.flash_command_timeout_seconds}s"
        if exc.stderr:
            stderr = f"{stderr}\n{exc.stderr}"
        return subprocess.CompletedProcess(command, 124, exc.stdout or "", stderr)


def _stage_flash_artifacts(args: argparse.Namespace) -> None:
    pairs = _resolve_local_flash_files(args)
    missing = [str(local_path) for local_path, _ in pairs if not local_path.exists()]
    if missing:
        raise RuntimeError(f"missing local flash artifacts: {', '.join(missing)}")

    remote_dirs = sorted({str(remote_path.parent) for _, remote_path in pairs})
    mkdir_lines = ["$ProgressPreference='SilentlyContinue'"]
    for remote_dir in remote_dirs:
        mkdir_lines.append(f"New-Item -ItemType Directory -Force {_quote_ps(remote_dir)} | Out-Null")
    mkdir_result = _run_remote(";".join(mkdir_lines), args, command_timeout_seconds=args.command_timeout_seconds)
    if mkdir_result.returncode != 0:
        raise RuntimeError(mkdir_result.stderr.strip() or mkdir_result.stdout.strip() or "remote mkdir failed")

    for local_path, remote_path in pairs:
        copy_result = _run_scp(local_path, remote_path, args)
        if copy_result.returncode != 0:
            raise RuntimeError(copy_result.stderr.strip() or copy_result.stdout.strip() or f"scp failed for {local_path.name}")


def _stage_text_file(content: str, remote_path: PureWindowsPath, args: argparse.Namespace) -> None:
    temp_path = Path(os.getenv("TEMP", ".")) / f"codex-remote-{int(time.time() * 1000)}.py"
    temp_path.write_text(content, encoding="utf-8")
    try:
        copy_result = _run_scp(temp_path, remote_path, args)
        if copy_result.returncode != 0:
            raise RuntimeError(copy_result.stderr.strip() or copy_result.stdout.strip() or f"scp failed for {remote_path.name}")
    finally:
        try:
            temp_path.unlink()
        except OSError:
            pass


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
                    ok, error = _confirm_ready_port(port, probe_baud, args)
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


def _confirm_ready_port(port: str, baud: int, args: argparse.Namespace) -> tuple[bool, str]:
    ready_probe_count = max(int(getattr(args, "ready_probes", 1) or 1), 1)
    ready_settle_ms = max(int(getattr(args, "ready_settle_ms", 0) or 0), 0)
    required_rechecks = max(ready_probe_count - 1, 1 if ready_settle_ms > 0 else 0)
    if required_rechecks == 0:
        return True, ""

    last_error = ""
    for _ in range(required_rechecks):
        if ready_settle_ms > 0:
            time.sleep(ready_settle_ms / 1000.0)
        ok, error = _probe_remote_port(port, baud, args)
        if not ok:
            return False, error or "port became unavailable during settle"
        last_error = error or last_error
    return True, last_error


def _build_esptool_args(args: argparse.Namespace, port: str) -> list[str]:
    flasher_args = json.loads(Path(args.flasher_args).read_text(encoding="utf-8"))
    extra = flasher_args.get("extra_esptool_args", {})
    flash_items: list[str] = []
    for offset, file_name in flasher_args.get("flash_files", {}).items():
        flash_items.extend([str(offset), str(PureWindowsPath(args.stage_dir) / file_name)])
    before = args.before if getattr(args, "before", None) is not None else str(extra.get("before") or "default_reset")
    after = args.after if getattr(args, "after", None) is not None else str(extra.get("after") or "hard_reset")
    use_stub = extra.get("stub") is not False
    if getattr(args, "no_stub", False):
        use_stub = False
    return [
        "--chip", str(extra.get("chip") or args.chip), "-p", port, "-b", str(args.flash_baud),
        "--before", before,
        "--after", after,
        *(["--no-stub"] if not use_stub else []),
        "write_flash",
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


def _build_remote_wait_flash_script(args: argparse.Namespace) -> str:
    local_flasher_path = Path(args.flasher_args).resolve()
    remote_flasher_path = str(PureWindowsPath(args.stage_dir) / local_flasher_path.name)
    remote_script_path = str(PureWindowsPath(args.stage_dir) / "remote_wait_flash.py")
    payload = {
        "port": args.port,
        "baud": int(args.baud),
        "flash_baud": int(args.flash_baud),
        "max_wait_seconds": int(args.max_wait_seconds),
        "probe_interval_ms": int(args.probe_interval_ms),
        "ready_settle_ms": int(args.ready_settle_ms),
        "ready_probes": int(args.ready_probes),
        "preferred_vid": str(args.preferred_vid),
        "preferred_pid": str(args.preferred_pid),
        "remote_python": args.remote_python,
        "remote_esptool": args.remote_esptool,
        "remote_flasher_args": remote_flasher_path,
        "remote_script_path": remote_script_path,
        "stage_dir": args.stage_dir,
        "chip": args.chip,
        "before": getattr(args, "before", None),
        "after": getattr(args, "after", None),
        "no_stub": bool(getattr(args, "no_stub", False)),
        "flash_timeout_seconds": float(args.flash_command_timeout_seconds),
        "wait_for_port": bool(getattr(args, "wait_for_port", True)),
    }
    payload_json = json.dumps(payload)
    return f"""
import json
import subprocess
import time
from pathlib import PureWindowsPath

import serial
from serial.tools import list_ports

CFG = json.loads({payload_json!r})
TRANSIENT_PATTERNS = {json.dumps(list(TRANSIENT_FLASH_ERRORS))}


def find_candidate_ports():
    preferred_port = str(CFG.get("port") or "").upper()
    preferred_vid = str(CFG.get("preferred_vid") or "").lower().replace("0x", "")
    preferred_pid = str(CFG.get("preferred_pid") or "").lower().replace("0x", "")
    items = []
    for port in list_ports.comports():
        if preferred_port and str(port.device).upper() != preferred_port:
            continue
        hwid = str(getattr(port, "hwid", "") or "")
        pnp = hwid.lower()
        if preferred_vid and preferred_pid and preferred_vid not in pnp and preferred_pid not in pnp:
            pass
        items.append(port.device)
    return items


def probe_port(port_name, baud):
    try:
        ser = serial.Serial()
        ser.port = port_name
        ser.baudrate = baud
        ser.timeout = 0.2
        ser.dsrdtr = False
        ser.rtscts = False
        ser.dtr = False
        ser.rts = False
        ser.open()
        ser.close()
        return True, ""
    except Exception as exc:
        return False, str(exc)


def confirm_ready_port(port_name):
    ready_probe_count = max(int(CFG.get("ready_probes") or 1), 1)
    ready_settle_ms = max(int(CFG.get("ready_settle_ms") or 0), 0)
    required_rechecks = max(ready_probe_count - 1, 1 if ready_settle_ms > 0 else 0)
    if required_rechecks == 0:
        return True, ""
    last_error = ""
    for _ in range(required_rechecks):
        if ready_settle_ms > 0:
            time.sleep(ready_settle_ms / 1000.0)
        ok, error = probe_port(port_name, int(CFG["baud"]))
        if not ok:
            return False, error or "port became unavailable during settle"
        last_error = error or last_error
    return True, last_error


def build_flash_args(port_name):
    flasher = json.loads(Path(CFG["remote_flasher_args"]).read_text(encoding="utf-8"))
    extra = flasher.get("extra_esptool_args", {{}})
    flash_items = []
    stage_root = PureWindowsPath(CFG["stage_dir"])
    for offset, file_name in flasher.get("flash_files", {{}}).items():
        flash_items.extend([str(offset), str(stage_root / PureWindowsPath(str(file_name)))])
    before = CFG.get("before")
    if before is None:
        before = str(extra.get("before") or "default_reset")
    after = CFG.get("after")
    if after is None:
        after = str(extra.get("after") or "hard_reset")
    use_stub = extra.get("stub") is not False
    if CFG.get("no_stub"):
        use_stub = False
    return [
        "--chip", str(extra.get("chip") or CFG["chip"]),
        "-p", port_name,
        "-b", str(CFG["flash_baud"]),
        "--before", before,
        "--after", after,
        *(["--no-stub"] if not use_stub else []),
        "write_flash",
        *[str(item) for item in flasher.get("write_flash_args", [])],
        *flash_items,
    ]


def flash_once(port_name):
    argv = [CFG["remote_python"], CFG["remote_esptool"], *build_flash_args(port_name)]
    try:
        return subprocess.run(
            argv,
            capture_output=True,
            text=True,
            check=False,
            timeout=float(CFG["flash_timeout_seconds"]),
        )
    except subprocess.TimeoutExpired as exc:
        return subprocess.CompletedProcess(argv, 124, exc.stdout or "", f"remote flash timed out after {{CFG['flash_timeout_seconds']}}s")


def is_transient(result):
    text = f"{{result.stdout}}\\n{{result.stderr}}".lower()
    return any(pattern in text for pattern in TRANSIENT_PATTERNS)


def main():
    start = time.monotonic()
    attempts = 0
    last_error = ""
    candidate_ports = []
    while time.monotonic() - start < float(CFG["max_wait_seconds"]):
        attempts += 1
        candidate_ports = find_candidate_ports()
        if not candidate_ports:
            last_error = "port not enumerated"
            time.sleep(max(int(CFG["probe_interval_ms"]), 100) / 1000.0)
            continue
        selected = candidate_ports[0]
        ok, error = probe_port(selected, int(CFG["baud"]))
        if not ok:
            last_error = error or last_error
            time.sleep(max(int(CFG["probe_interval_ms"]), 100) / 1000.0)
            continue
        ok, error = confirm_ready_port(selected)
        if not ok:
            last_error = error or last_error
            time.sleep(max(int(CFG["probe_interval_ms"]), 100) / 1000.0)
            continue
        result = flash_once(selected)
        if result.returncode == 0:
            print(json.dumps({{
                "status": "flash-ok",
                "port": selected,
                "attempts": attempts,
                "elapsed_seconds": round(time.monotonic() - start, 2),
                "candidate_ports": candidate_ports,
                "last_error": last_error,
                "flash_exit_code": 0,
            }}))
            return
        last_error = (result.stderr or result.stdout or "").strip() or last_error
        if not CFG.get("wait_for_port") or not is_transient(result):
            print(json.dumps({{
                "status": "flash-failed",
                "port": selected,
                "attempts": attempts,
                "elapsed_seconds": round(time.monotonic() - start, 2),
                "candidate_ports": candidate_ports,
                "last_error": last_error,
                "flash_exit_code": result.returncode,
            }}))
            return
        time.sleep(max(int(CFG["probe_interval_ms"]), 100) / 1000.0)
    print(json.dumps({{
        "status": "timeout",
        "port": None,
        "attempts": attempts,
        "elapsed_seconds": round(time.monotonic() - start, 2),
        "candidate_ports": candidate_ports,
        "last_error": last_error,
        "flash_exit_code": None,
    }}))


from pathlib import Path
main()
"""


def _run_remote_wait_flash(args: argparse.Namespace) -> RemoteFlashResult:
    script = _build_remote_wait_flash_script(args)
    remote_script_path = PureWindowsPath(args.stage_dir) / "remote_wait_flash.py"
    try:
        _stage_text_file(script, remote_script_path, args)
    except RuntimeError as exc:
        return RemoteFlashResult("stage-failed", None, 0, 0.0, [], str(exc), None)
    py_script = (
        "import runpy\n"
        f"runpy.run_path({str(remote_script_path)!r}, run_name='__main__')\n"
    )
    timeout_seconds = args.max_wait_seconds + args.flash_command_timeout_seconds + 30
    result = _run_remote_python(py_script, args, command_timeout_seconds=timeout_seconds)
    if result.returncode != 0:
        return RemoteFlashResult(
            "flash-failed",
            None,
            0,
            0.0,
            [],
            result.stderr.strip() or result.stdout.strip() or "remote wait/flash failed",
            result.returncode,
        )
    try:
        payload = json.loads(result.stdout.strip() or "{}")
    except json.JSONDecodeError:
        return RemoteFlashResult(
            "flash-failed",
            None,
            0,
            0.0,
            [],
            result.stdout.strip() or "remote wait/flash returned invalid json",
            None,
        )
    return RemoteFlashResult(
        str(payload.get("status") or "flash-failed"),
        payload.get("port"),
        int(payload.get("attempts") or 0),
        float(payload.get("elapsed_seconds") or 0.0),
        list(payload.get("candidate_ports") or []),
        str(payload.get("last_error") or ""),
        payload.get("flash_exit_code"),
    )


def cmd_flash(args: argparse.Namespace) -> int:
    stage_artifacts = bool(getattr(args, "stage_artifacts", True))
    stage_only = bool(getattr(args, "stage_only", False))
    if stage_artifacts:
        try:
            _stage_flash_artifacts(args)
        except RuntimeError as exc:
            result = RemoteFlashResult("stage-failed", None, 0, 0.0, [], str(exc), None)
            if args.json:
                print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
            else:
                print(str(exc), file=sys.stderr)
            return 2
        if stage_only:
            result = RemoteFlashResult("stage-ok", None, 0, 0.0, [], "", 0)
            if args.json:
                print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
            else:
                print(f"stage-ok stage_dir={args.stage_dir}")
            return 0

    emit_output = not args.json
    result = _run_remote_wait_flash(args) if args.wait_for_port else RemoteFlashResult("timeout", None, 0, 0.0, [], "", None)
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
    flash.add_argument("--ready-settle-ms", type=int, default=int(_env("ESP32_REMOTE_READY_SETTLE_MS", "1200") or "1200"))
    flash.add_argument("--ready-probes", type=int, default=int(_env("ESP32_REMOTE_READY_PROBES", "2") or "2"))
    flash.add_argument("--preferred-vid", default=_env("ESP32_REMOTE_PREFERRED_VID", "0x303A"))
    flash.add_argument("--preferred-pid", default=_env("ESP32_REMOTE_PREFERRED_PID", "0x1001"))
    flash.add_argument("--chip", default="esp32s3")
    flash.add_argument("--remote-esptool", default=_env("ESP32_REMOTE_ESPTOOL", r"D:\ESP_IDF\esp\v5.5.1\esp-idf\components\esptool_py\esptool\esptool.py"))
    flash.add_argument("--no-stage", dest="stage_artifacts", action="store_false")
    flash.add_argument("--stage-only", action="store_true")
    flash.add_argument("--before")
    flash.add_argument("--after")
    flash.add_argument("--no-stub", action="store_true")
    flash.add_argument("--no-wait", dest="wait_for_port", action="store_false")
    flash.add_argument("--json", action="store_true")
    flash.set_defaults(func=cmd_flash, wait_for_port=True, stage_artifacts=True)
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
