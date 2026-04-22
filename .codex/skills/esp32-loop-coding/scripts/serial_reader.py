#!/usr/bin/env python3
"""Read ESP32 serial output, survive sleep disconnects, and append one continuous log."""

from __future__ import annotations

import argparse
import json
import os
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import serial

from env_loader import load_skill_env

FATAL_PATTERNS = ["Guru Meditation Error", "panic", "abort()", "assert failed", "Backtrace:"]
BOOT_PATTERNS = ["Loaded app", "Calling app_main", "app_main", "TRACKER_MAIN: Boot"]
RUNTIME_PATTERNS = ["STATE_MACHINE:", "MODEM_GNSS:", "TRACKER_MQTT:", "mqtt status=", "HW diag supply="]
ERROR_PATTERN = "E ("
IGNORABLE_ERROR_PATTERNS = ["STATE_MACHINE: retry step=connect_or_ble_stack_or_elm327_init_failed"]
IGNORABLE_ERROR_PATTERNS.extend(
    [
        "esp-tls: couldn't get hostname for :",
        "transport_base: Failed to open a new connection:",
        "mqtt_client: Error transport connect",
        "mqtt_client: Client has not connected",
        "TRACKER_MQTT: MQTT error type=",
        "STATE_MACHINE: retry step=tracker_mqtt_subscribe_commands",
        "esp-tls: [sock=",
    ]
)


@dataclass
class ReadResult:
    status: str
    elapsed_seconds: float
    lines_captured: int
    fatal_count: int
    error_count: int
    boot_count: int
    runtime_count: int
    reconnect_count: int
    log_file: str
    error_message: str = ""


def _has_any(line: str, patterns: list[str]) -> bool:
    return any(pattern in line for pattern in patterns)


def _open_serial(port: str, baud: int) -> serial.Serial:
    ser = serial.Serial()
    ser.port = port
    ser.baudrate = baud
    ser.timeout = 0.2
    ser.dsrdtr = False
    ser.rtscts = False
    ser.dtr = False
    ser.rts = False
    ser.open()
    return ser


def _write_marker(out, port: str, event: str, detail: str = "") -> None:
    suffix = f" detail={detail}" if detail else ""
    out.write(f"===== serial {event} port={port} ts={int(time.time())}{suffix} =====\n")
    out.flush()


def read_serial(
    port: str,
    baud: int,
    log_file: str,
    max_seconds: int,
    stable_seconds: int,
    quiet_seconds: int,
) -> ReadResult:
    start = time.monotonic()
    last_activity = start
    lines_captured = fatal_count = error_count = boot_count = runtime_count = reconnect_count = 0
    status = "timeout"
    error_message = ""
    ever_connected = False
    last_open_error = ""
    ser: serial.Serial | None = None

    Path(log_file).parent.mkdir(parents=True, exist_ok=True)
    with Path(log_file).open("a", encoding="utf-8", errors="replace") as out:
        out.write(f"\n===== monitor start port={port} ts={int(time.time())} =====\n")
        out.flush()

        while time.monotonic() - start < max_seconds:
            now = time.monotonic()
            if ser is None:
                try:
                    ser = _open_serial(port, baud)
                    if ever_connected:
                        reconnect_count += 1
                        _write_marker(out, port, "reconnect")
                    else:
                        _write_marker(out, port, "open")
                    ever_connected = True
                    last_open_error = ""
                    continue
                except (serial.SerialException, PermissionError, OSError) as exc:
                    error_message = str(exc)
                    if error_message != last_open_error:
                        _write_marker(out, port, "unavailable", error_message)
                        last_open_error = error_message
                    time.sleep(0.5)
                    continue

            try:
                data = ser.readline()
            except (serial.SerialException, PermissionError, OSError) as exc:
                error_message = str(exc)
                _write_marker(out, port, "disconnect", error_message)
                try:
                    ser.close()
                except Exception:
                    pass
                ser = None
                time.sleep(0.5)
                continue

            if not data:
                if quiet_seconds > 0 and (now - last_activity) >= quiet_seconds and (boot_count > 0 or runtime_count > 0):
                    if (now - last_activity) >= stable_seconds:
                        status = "stable"
                        break
                continue

            last_activity = now
            line = data.decode("utf-8", errors="replace").rstrip("\r\n")
            out.write(line + "\n")
            out.flush()
            lines_captured += 1

            if _has_any(line, BOOT_PATTERNS):
                boot_count += 1
            if _has_any(line, RUNTIME_PATTERNS):
                runtime_count += 1
            if _has_any(line, FATAL_PATTERNS):
                fatal_count += 1
                status = "fatal"
                break
            if ERROR_PATTERN in line and not _has_any(line, IGNORABLE_ERROR_PATTERNS):
                error_count += 1
                status = "unstable"
                break

        if ser is not None:
            ser.close()

    if status == "timeout" and not ever_connected and lines_captured == 0 and error_message:
        status = "serial-error"
    elif status == "timeout" and error_count == 0 and fatal_count == 0 and (boot_count > 0 or runtime_count > 0):
        status = "stable"

    elapsed = round(time.monotonic() - start, 2)
    return ReadResult(
        status=status,
        elapsed_seconds=elapsed,
        lines_captured=lines_captured,
        fatal_count=fatal_count,
        error_count=error_count,
        boot_count=boot_count,
        runtime_count=runtime_count,
        reconnect_count=reconnect_count,
        log_file=log_file,
        error_message=error_message,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read ESP32 serial and append log")
    parser.add_argument("--port", required=True)
    parser.add_argument("--baud", type=int, default=int(os.getenv("ESP32_BAUD", "115200")))
    parser.add_argument("--log-file", required=True)
    parser.add_argument("--max-seconds", type=int, default=int(os.getenv("ESP32_MAX_SECONDS", "120")))
    parser.add_argument("--stable-seconds", type=int, default=int(os.getenv("ESP32_STABLE_SECONDS", "20")))
    parser.add_argument("--quiet-seconds", type=int, default=int(os.getenv("ESP32_QUIET_SECONDS", "3")))
    parser.add_argument("--json", action="store_true")
    return parser


def main() -> int:
    load_skill_env("esp32-loop-coding")
    parser = build_parser()
    args = parser.parse_args()
    result = read_serial(
        port=args.port,
        baud=args.baud,
        log_file=args.log_file,
        max_seconds=args.max_seconds,
        stable_seconds=args.stable_seconds,
        quiet_seconds=args.quiet_seconds,
    )
    if args.json:
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    else:
        print(
            f"status={result.status} lines={result.lines_captured} fatal={result.fatal_count} "
            f"error={result.error_count} boot={result.boot_count} runtime={result.runtime_count} "
            f"reconnect={result.reconnect_count}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
