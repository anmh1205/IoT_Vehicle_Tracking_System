#!/usr/bin/env python3
"""Read ESP32 serial output until fatal/error/stable/timeout and append to log."""

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
ERROR_PATTERN = "E ("
IGNORABLE_ERROR_PATTERNS = ["STATE_MACHINE: retry step=connect_or_ble_stack_or_elm327_init_failed"]


@dataclass
class ReadResult:
    status: str
    elapsed_seconds: float
    lines_captured: int
    fatal_count: int
    error_count: int
    boot_count: int
    log_file: str
    error_message: str = ""


def _has_any(line: str, patterns: list[str]) -> bool:
    return any(pattern in line for pattern in patterns)


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
    last_error_or_fatal = start

    lines_captured = 0
    fatal_count = 0
    error_count = 0
    boot_count = 0

    Path(log_file).parent.mkdir(parents=True, exist_ok=True)

    status = "timeout"
    error_message = ""

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

        with ser, Path(log_file).open("a", encoding="utf-8", errors="replace") as out:
            out.write(f"\n===== monitor start port={port} ts={int(time.time())} =====\n")

            while True:
                now = time.monotonic()
                if now - start >= max_seconds:
                    status = "timeout"
                    break

                data = ser.readline()
                if not data:
                    if quiet_seconds > 0 and (now - last_activity) >= quiet_seconds and boot_count > 0:
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

                if _has_any(line, FATAL_PATTERNS):
                    fatal_count += 1
                    last_error_or_fatal = now
                    status = "fatal"
                    break

                if ERROR_PATTERN in line:
                    if _has_any(line, IGNORABLE_ERROR_PATTERNS):
                        continue
                    error_count += 1
                    last_error_or_fatal = now
                    status = "unstable"
                    break

                # Do not stop purely by elapsed time after boot while log stream is still active.
                # Stability is decided by a quiet window in the no-data branch above.
    except serial.SerialException as exc:
        status = "serial-error"
        error_message = str(exc)

    elapsed = round(time.monotonic() - start, 2)
    return ReadResult(
        status=status,
        elapsed_seconds=elapsed,
        lines_captured=lines_captured,
        fatal_count=fatal_count,
        error_count=error_count,
        boot_count=boot_count,
        log_file=log_file,
        error_message=error_message,
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Read ESP32 serial and append log")
    parser.add_argument("--port", required=True)
    parser.add_argument("--baud", type=int, default=int(os.getenv("ESP32_BAUD", "115200")))
    parser.add_argument("--log-file", required=True)
    parser.add_argument("--max-seconds", type=int, default=int(os.getenv("ESP32_MAX_SECONDS", "120")))
    parser.add_argument(
        "--stable-seconds", type=int, default=int(os.getenv("ESP32_STABLE_SECONDS", "20"))
    )
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
            f"status={result.status} lines={result.lines_captured} "
            f"fatal={result.fatal_count} error={result.error_count} boot={result.boot_count}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
