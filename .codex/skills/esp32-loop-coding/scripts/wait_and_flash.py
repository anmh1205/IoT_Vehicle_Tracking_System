#!/usr/bin/env python3
"""Wait for a flaky ESP32 USB port to become openable, then flash immediately."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import serial
from serial.tools import list_ports

from env_loader import load_skill_env


@dataclass
class FlashPlan:
    mode: str
    cwd: str
    display: str
    argv: list[str] | None = None
    command: str | None = None


@dataclass
class WaitAndFlashResult:
    status: str
    flash_mode: str
    port: str | None
    attempts: int
    elapsed_seconds: float
    candidate_ports: list[str]
    last_error: str
    flash_command: str
    flash_exit_code: int | None
    flash_stdout_tail: list[str]
    flash_stderr_tail: list[str]


def find_matching_ports(
    preferred_port: str | None,
    vid: int | None,
    pid: int | None,
    description_contains: str | None,
) -> list[str]:
    needle = (description_contains or "").lower()
    matches: list[str] = []
    for port in list_ports.comports():
        if preferred_port and port.device.upper() != preferred_port.upper():
            continue
        if vid is not None and port.vid != vid:
            continue
        if pid is not None and port.pid != pid:
            continue
        description = f"{port.description or ''} {port.hwid or ''}".lower()
        if needle and needle not in description:
            continue
        matches.append(port.device)
    return matches


def probe_port(port: str, baud: int) -> tuple[bool, str]:
    try:
        ser = serial.Serial()
        ser.port = port
        ser.baudrate = baud
        ser.timeout = 0.2
        ser.dsrdtr = False
        ser.rtscts = False
        ser.dtr = False
        ser.rts = False
        ser.open()
        ser.close()
        return True, ""
    except (serial.SerialException, PermissionError, OSError) as exc:
        return False, str(exc)


def wait_for_ready_port(
    preferred_port: str | None,
    vid: int | None,
    pid: int | None,
    description_contains: str | None,
    baud: int,
    max_wait_seconds: int,
    probe_interval_ms: int,
) -> tuple[str | None, int, float, list[str], str]:
    start = time.monotonic()
    attempts = 0
    last_error = ""
    candidate_ports: list[str] = []
    interval_seconds = max(probe_interval_ms, 100) / 1000.0

    while time.monotonic() - start < max_wait_seconds:
        attempts += 1
        candidate_ports = find_matching_ports(preferred_port, vid, pid, description_contains)
        if not candidate_ports:
            last_error = "port not enumerated"
        for port in candidate_ports:
            ok, error = probe_port(port, baud)
            if ok:
                return port, attempts, round(time.monotonic() - start, 2), candidate_ports, last_error
            if error:
                last_error = error
        time.sleep(interval_seconds)

    return None, attempts, round(time.monotonic() - start, 2), candidate_ports, last_error


def _load_json(path: Path) -> dict:
    if not path.exists():
        raise RuntimeError(f"Missing file: {path}")
    return json.loads(path.read_text(encoding="utf-8", errors="replace"))


def _tail_lines(text: str, limit: int = 60) -> list[str]:
    return text.splitlines()[-limit:]


def _is_retryable_flash_failure(completed: subprocess.CompletedProcess[str]) -> bool:
    combined = "\n".join(
        part for part in [completed.stdout or "", completed.stderr or ""] if part
    ).lower()
    retryable_markers = [
        "failed to connect to esp32",
        "no serial data received",
        "could not open com",
        "could not open port",
        "access is denied",
        "port is busy",
        "device attached to the system is not functioning",
        "permissionerror",
        "doesn't exist",
        "cannot configure port",
    ]
    return any(marker in combined for marker in retryable_markers)


def find_esptool_python(explicit_python: str | None) -> str | None:
    candidates: list[Path] = []
    for raw in [explicit_python, os.getenv("ESP32_ESPTOOL_PYTHON")]:
        if raw:
            candidate = Path(raw)
            if candidate.exists():
                return str(candidate)

    idf_python_env = os.getenv("IDF_PYTHON_ENV_PATH")
    if idf_python_env:
        candidate = Path(idf_python_env) / "Scripts" / "python.exe"
        if candidate.exists():
            return str(candidate)

    search_roots = [Path("C:/Espressif/python_env"), Path.home() / ".espressif" / "python_env"]
    for root in search_roots:
        if root.exists():
            candidates.extend(root.glob("*/Scripts/python.exe"))
    if not candidates:
        return None
    candidates.sort(key=lambda item: item.stat().st_mtime, reverse=True)
    return str(candidates[0])


def find_esptool_script(explicit_script: str | None, idf_path: str | None) -> str | None:
    for raw in [explicit_script, os.getenv("ESP32_ESPTOOL_SCRIPT")]:
        if raw:
            candidate = Path(raw)
            if candidate.exists():
                return str(candidate)
    if not idf_path:
        return None
    candidate = Path(idf_path) / "components" / "esptool_py" / "esptool" / "esptool.py"
    return str(candidate) if candidate.exists() else None


def build_esptool_plan(
    firmware_dir: Path,
    flash_baud: int,
    esptool_python: str | None,
    esptool_script: str | None,
) -> FlashPlan:
    build_dir = firmware_dir / "build"
    flasher_args = _load_json(build_dir / "flasher_args.json")
    project_description = _load_json(build_dir / "project_description.json")

    python_exe = find_esptool_python(esptool_python)
    script_path = find_esptool_script(esptool_script, project_description.get("idf_path"))
    if not python_exe or not script_path:
        raise RuntimeError("Could not resolve ESP-IDF python/esptool for direct flash")

    extra_args = flasher_args.get("extra_esptool_args", {})
    chip = str(extra_args.get("chip") or project_description.get("target") or "esp32")
    argv = [python_exe, script_path, "--chip", chip, "-p", "{port}", "-b", str(flash_baud)]
    if extra_args.get("before"):
        argv.extend(["--before", str(extra_args["before"])])
    if extra_args.get("after"):
        argv.extend(["--after", str(extra_args["after"])])
    if extra_args.get("stub") is False:
        argv.append("--no-stub")
    argv.append("write_flash")
    argv.extend(str(item) for item in flasher_args.get("write_flash_args", []))
    for offset, file_name in flasher_args.get("flash_files", {}).items():
        argv.extend([str(offset), str(file_name)])

    display = subprocess.list2cmdline([item.replace("{port}", "<PORT>") for item in argv])
    return FlashPlan(mode="esptool-direct", cwd=str(build_dir), display=display, argv=argv)


def build_command_plan(
    firmware_dir: Path,
    export_script: str | None,
    flash_command_template: str,
    flash_baud: int,
) -> FlashPlan:
    flash_part = flash_command_template.format(
        port="{port}",
        firmware_dir=str(firmware_dir),
        flash_baud=flash_baud,
    )
    statements = [f"Set-Location '{firmware_dir}'"]
    if export_script:
        statements.insert(0, f"& '{Path(export_script)}'")
    command = "; ".join(statements + [flash_part])
    return FlashPlan(mode="command", cwd=str(firmware_dir), display=command.replace("{port}", "<PORT>"), command=command)


def resolve_flash_plan(
    firmware_dir: Path,
    flash_method: str,
    export_script: str | None,
    flash_command_template: str,
    flash_baud: int,
    esptool_python: str | None,
    esptool_script: str | None,
) -> FlashPlan:
    esptool_error = ""
    if flash_method in {"auto", "esptool"}:
        try:
            return build_esptool_plan(firmware_dir, flash_baud, esptool_python, esptool_script)
        except RuntimeError as exc:
            esptool_error = str(exc)
            if flash_method == "esptool":
                raise
    if not flash_command_template:
        raise RuntimeError(esptool_error or "No flash command configured")
    return build_command_plan(firmware_dir, export_script, flash_command_template, flash_baud)


def run_flash(plan: FlashPlan, port: str) -> subprocess.CompletedProcess[str]:
    try:
        if plan.argv is not None:
            argv = [item.replace("{port}", port) for item in plan.argv]
            return subprocess.run(argv, cwd=plan.cwd, capture_output=True, text=True, check=False)
        command = (plan.command or "").replace("{port}", port)
        return subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
            cwd=plan.cwd,
            capture_output=True,
            text=True,
            check=False,
        )
    except OSError as exc:
        return subprocess.CompletedProcess(args=plan.argv or plan.command or "", returncode=1, stdout="", stderr=str(exc))


def run_wait_and_flash(
    firmware_dir: Path,
    preferred_port: str | None,
    vid: int | None,
    pid: int | None,
    description_contains: str | None,
    baud: int,
    max_wait_seconds: int,
    probe_interval_ms: int,
    export_script: str | None,
    flash_command_template: str,
    flash_method: str,
    flash_baud: int,
    esptool_python: str | None,
    esptool_script: str | None,
    no_flash: bool,
) -> WaitAndFlashResult:
    started_at = time.monotonic()
    try:
        flash_plan = resolve_flash_plan(
            firmware_dir, flash_method, export_script, flash_command_template, flash_baud, esptool_python, esptool_script
        )
    except RuntimeError as exc:
        return WaitAndFlashResult(
            status="config-error",
            flash_mode=flash_method,
            port=None,
            attempts=0,
            elapsed_seconds=0.0,
            candidate_ports=[],
            last_error=str(exc),
            flash_command="",
            flash_exit_code=None,
            flash_stdout_tail=[],
            flash_stderr_tail=[],
        )

    total_attempts = 0
    candidate_ports: list[str] = []
    last_error = ""
    last_port: str | None = None
    last_rendered_command = flash_plan.display
    last_flash_exit_code: int | None = None
    last_flash_stdout_tail: list[str] = []
    last_flash_stderr_tail: list[str] = []

    while True:
        elapsed_before_wait = time.monotonic() - started_at
        remaining_wait_seconds = max_wait_seconds - int(elapsed_before_wait)
        if remaining_wait_seconds <= 0:
            status = "flash-failed" if last_flash_exit_code is not None else "timeout"
            return WaitAndFlashResult(
                status=status,
                flash_mode=flash_plan.mode,
                port=last_port,
                attempts=total_attempts,
                elapsed_seconds=round(time.monotonic() - started_at, 2),
                candidate_ports=candidate_ports,
                last_error=last_error,
                flash_command=last_rendered_command,
                flash_exit_code=last_flash_exit_code,
                flash_stdout_tail=last_flash_stdout_tail,
                flash_stderr_tail=last_flash_stderr_tail,
            )

        port, attempts, _, candidate_ports, last_error = wait_for_ready_port(
            preferred_port, vid, pid, description_contains, baud, remaining_wait_seconds, probe_interval_ms
        )
        total_attempts += attempts
        if not port:
            status = "flash-failed" if last_flash_exit_code is not None else "timeout"
            return WaitAndFlashResult(
                status=status,
                flash_mode=flash_plan.mode,
                port=last_port,
                attempts=total_attempts,
                elapsed_seconds=round(time.monotonic() - started_at, 2),
                candidate_ports=candidate_ports,
                last_error=last_error,
                flash_command=last_rendered_command,
                flash_exit_code=last_flash_exit_code,
                flash_stdout_tail=last_flash_stdout_tail,
                flash_stderr_tail=last_flash_stderr_tail,
            )

        rendered_command = flash_plan.display.replace("<PORT>", port)
        last_port = port
        last_rendered_command = rendered_command
        if no_flash:
            return WaitAndFlashResult(
                status="ready-no-flash",
                flash_mode=flash_plan.mode,
                port=port,
                attempts=total_attempts,
                elapsed_seconds=round(time.monotonic() - started_at, 2),
                candidate_ports=candidate_ports,
                last_error=last_error,
                flash_command=rendered_command,
                flash_exit_code=None,
                flash_stdout_tail=[],
                flash_stderr_tail=[],
            )

        completed = run_flash(flash_plan, port)
        last_flash_exit_code = completed.returncode
        last_flash_stdout_tail = _tail_lines(completed.stdout)
        last_flash_stderr_tail = _tail_lines(completed.stderr)
        if completed.returncode == 0:
            return WaitAndFlashResult(
                status="flash-ok",
                flash_mode=flash_plan.mode,
                port=port,
                attempts=total_attempts,
                elapsed_seconds=round(time.monotonic() - started_at, 2),
                candidate_ports=candidate_ports,
                last_error=last_error,
                flash_command=rendered_command,
                flash_exit_code=completed.returncode,
                flash_stdout_tail=last_flash_stdout_tail,
                flash_stderr_tail=last_flash_stderr_tail,
            )

        if not _is_retryable_flash_failure(completed):
            return WaitAndFlashResult(
                status="flash-failed",
                flash_mode=flash_plan.mode,
                port=port,
                attempts=total_attempts,
                elapsed_seconds=round(time.monotonic() - started_at, 2),
                candidate_ports=candidate_ports,
                last_error=last_error,
                flash_command=rendered_command,
                flash_exit_code=completed.returncode,
                flash_stdout_tail=last_flash_stdout_tail,
                flash_stderr_tail=last_flash_stderr_tail,
            )

        time.sleep(max(probe_interval_ms, 100) / 1000.0)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Wait for an ESP32 port to become usable, then flash")
    parser.add_argument("--firmware-dir", required=True)
    parser.add_argument("--port", help="Preferred COM port, for example COM5")
    parser.add_argument("--vid", type=lambda value: int(value, 0), help="USB VID, example 0x303A")
    parser.add_argument("--pid", type=lambda value: int(value, 0), help="USB PID, example 0x1001")
    parser.add_argument("--description-contains", help="Case-insensitive substring match for description or HWID")
    parser.add_argument("--baud", type=int, default=int(os.getenv("ESP32_BAUD", "115200")))
    parser.add_argument("--flash-baud", type=int, default=int(os.getenv("ESP32_FLASH_BAUD", "460800")))
    parser.add_argument("--max-wait-seconds", type=int, default=int(os.getenv("ESP32_WAIT_FLASH_MAX_WAIT_SECONDS", "600")))
    parser.add_argument("--probe-interval-ms", type=int, default=int(os.getenv("ESP32_WAIT_FLASH_PROBE_INTERVAL_MS", "1000")))
    parser.add_argument("--export-script", default=os.getenv("ESP32_IDF_EXPORT_PS1"))
    parser.add_argument("--flash-command", default=os.getenv("ESP32_WAIT_FLASH_COMMAND", "idf.py -p {port} flash"))
    parser.add_argument("--flash-method", choices=["auto", "esptool", "command"], default=os.getenv("ESP32_WAIT_FLASH_METHOD", "auto"))
    parser.add_argument("--esptool-python", default=os.getenv("ESP32_ESPTOOL_PYTHON"))
    parser.add_argument("--esptool-script", default=os.getenv("ESP32_ESPTOOL_SCRIPT"))
    parser.add_argument("--no-flash", action="store_true", help="Only wait for a ready port and print the command")
    parser.add_argument("--json", action="store_true")
    return parser


def main() -> int:
    load_skill_env("esp32-loop-coding")
    parser = build_parser()
    args = parser.parse_args()

    result = run_wait_and_flash(
        firmware_dir=Path(args.firmware_dir),
        preferred_port=args.port,
        vid=args.vid,
        pid=args.pid,
        description_contains=args.description_contains,
        baud=args.baud,
        max_wait_seconds=args.max_wait_seconds,
        probe_interval_ms=args.probe_interval_ms,
        export_script=args.export_script,
        flash_command_template=args.flash_command,
        flash_method=args.flash_method,
        flash_baud=args.flash_baud,
        esptool_python=args.esptool_python,
        esptool_script=args.esptool_script,
        no_flash=args.no_flash,
    )

    if args.json:
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    else:
        print(
            f"status={result.status} mode={result.flash_mode} port={result.port} "
            f"attempts={result.attempts} elapsed={result.elapsed_seconds}"
        )
        if result.flash_command:
            print(f"flash_command={result.flash_command}")
        if result.last_error:
            print(f"last_error={result.last_error}")

    return 0 if result.status in {"flash-ok", "ready-no-flash"} else 2


if __name__ == "__main__":
    raise SystemExit(main())
