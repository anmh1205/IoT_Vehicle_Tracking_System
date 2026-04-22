#!/usr/bin/env python3
"""Run ESP32 monitor/analyze/build/flash loop with COM auto-detection."""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import asdict, dataclass
from pathlib import Path

from com_detector import detect_ports
from env_loader import load_skill_env
from log_analyzer import analyze_lines
from serial_reader import read_serial


@dataclass
class IterationResult:
    iteration: int
    status: str
    action: str


@dataclass
class LoopResult:
    port: str
    log_file: str
    iterations: list[IterationResult]
    final_status: str


def _extract_com_number(port: str) -> str:
    match = re.search(r"(\d+)$", port)
    return match.group(1) if match else "x"


def resolve_port(preferred_port: str | None = None) -> str:
    if preferred_port:
        return preferred_port

    ports = detect_ports()
    if not ports:
        raise RuntimeError("No serial COM port detected")

    if len(ports) > 1:
        names = ", ".join(p.device for p in ports)
        raise RuntimeError(
            "Multiple COM ports detected. Ask user once with AskUserQuestion to choose one: "
            + names
        )
    return ports[0].device


def build_log_file_path(firmware_dir: Path, port: str) -> Path:
    com_num = _extract_com_number(port)
    return firmware_dir / "documents" / "test-logs" / f"com{com_num}-monitor-latest.log"


GNSS_FIX_SUCCESS_RE = re.compile(
    r"GNSS fix success lat=([+-]?\d+(?:\.\d+)?) lon=([+-]?\d+(?:\.\d+)?) sat=(\d+)"
)
CGNSINF_RE = re.compile(r"\+CGNSINF:\s*(.*)")


def _has_valid_gnss_fix(lines: list[str]) -> bool:
    for raw in lines:
        line = raw.strip()
        fixed = GNSS_FIX_SUCCESS_RE.search(line)
        if fixed and float(fixed.group(1)) != 0.0 and float(fixed.group(2)) != 0.0 and int(fixed.group(3)) > 0:
            return True
        cgnsinf = CGNSINF_RE.search(line)
        if not cgnsinf:
            continue
        fields = [part.strip() for part in cgnsinf.group(1).split(",")]
        if len(fields) < 16 or fields[1] != "1":
            continue
        try:
            lat, lon = float(fields[3] or 0.0), float(fields[4] or 0.0)
            sat = int(fields[14] or 0) + int(fields[15] or 0)
        except ValueError:
            continue
        if lat != 0.0 and lon != 0.0 and sat > 0:
            return True
    return False


def run_loop(
    firmware_dir: Path,
    preferred_port: str | None,
    max_iterations: int,
    baud: int,
    max_seconds: int,
    stable_seconds: int,
    quiet_seconds: int,
    gnss_streak_target: int = 3,
) -> LoopResult:
    port = resolve_port(preferred_port)
    log_file = build_log_file_path(firmware_dir, port)

    results: list[IterationResult] = []
    final_status = "unknown"
    gnss_fix_streak = 0

    existing_size = 0
    if log_file.exists():
        existing_size = log_file.stat().st_size

    for idx in range(1, max_iterations + 1):
        monitor_stable_seconds = stable_seconds if gnss_streak_target <= 0 else max_seconds
        read_result = read_serial(
            port=port,
            baud=baud,
            log_file=str(log_file),
            max_seconds=max_seconds,
            stable_seconds=monitor_stable_seconds,
            quiet_seconds=quiet_seconds,
        )

        if log_file.exists():
            current_size = log_file.stat().st_size
            read_size = max(current_size - existing_size, 0)
            full_lines: list[str] = []
            if read_size > 0:
                with log_file.open("rb") as lf:
                    lf.seek(existing_size)
                    delta_bytes = lf.read(read_size)
                    lf.seek(0)
                    full_bytes = lf.read()
                delta_text = delta_bytes.decode("utf-8", errors="replace")
                full_text = full_bytes.decode("utf-8", errors="replace")
                lines = delta_text.splitlines()[-800:]
                full_lines = full_text.splitlines()[-800:]
            else:
                lines = []
                full_lines = log_file.read_text(encoding="utf-8", errors="replace").splitlines()[-800:]
            existing_size = current_size
        else:
            lines = []
            full_lines = []
        analyzed = analyze_lines(lines)
        if analyzed.status == "unknown" and full_lines:
            analyzed = analyze_lines(full_lines)

        effective_status = read_result.status
        if effective_status == "serial-error" and analyzed.status == "stable":
            effective_status = "stable"
        if effective_status not in {"stable", "fatal", "unstable", "serial-error"}:
            effective_status = analyzed.status

        if effective_status == "stable":
            if _has_valid_gnss_fix(lines):
                gnss_fix_streak += 1
            else:
                gnss_fix_streak = 0

            if gnss_fix_streak >= gnss_streak_target:
                final_status = "stable"
                results.append(IterationResult(iteration=idx, status="stable", action="stop-gnss-ok"))
                break

            final_status = "stable-no-gnss"
            results.append(
                IterationResult(iteration=idx, status="stable-no-gnss", action="monitor-next-until-gnss-fix")
            )
            continue

        if effective_status in {"fatal", "unstable"}:
            action = "needs-code-fix-and-manual-build-flash"
            results.append(IterationResult(iteration=idx, status=effective_status, action=action))
            final_status = effective_status
            break

        if effective_status == "serial-error":
            results.append(
                IterationResult(iteration=idx, status="serial-error", action="wait-and-flash-or-check-port")
            )
            final_status = "serial-error"
            break

        results.append(
            IterationResult(iteration=idx, status=read_result.status, action="monitor-next")
        )
        final_status = read_result.status

    return LoopResult(port=port, log_file=str(log_file), iterations=results, final_status=final_status)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run ESP32 loop coding helper")
    parser.add_argument("--firmware-dir", required=True)
    parser.add_argument("--port", help="Selected COM port")
    parser.add_argument("--max-iterations", type=int, default=int(os.getenv("ESP32_MAX_ITERATIONS", "8")))
    parser.add_argument("--baud", type=int, default=int(os.getenv("ESP32_BAUD", "115200")))
    parser.add_argument("--max-seconds", type=int, default=int(os.getenv("ESP32_MAX_SECONDS", "120")))
    parser.add_argument(
        "--stable-seconds", type=int, default=int(os.getenv("ESP32_STABLE_SECONDS", "20"))
    )
    parser.add_argument("--quiet-seconds", type=int, default=int(os.getenv("ESP32_QUIET_SECONDS", "3")))
    parser.add_argument(
        "--gnss-streak-target",
        type=int,
        default=int(os.getenv("ESP32_GNSS_STREAK_TARGET", "3")),
        help="Consecutive stable iterations with valid GNSS fix required before stop",
    )
    parser.add_argument("--json", action="store_true")
    return parser


def main() -> int:
    load_skill_env("esp32-loop-coding")
    parser = build_parser()
    args = parser.parse_args()

    result = run_loop(
        firmware_dir=Path(args.firmware_dir),
        preferred_port=args.port,
        max_iterations=args.max_iterations,
        baud=args.baud,
        max_seconds=args.max_seconds,
        stable_seconds=args.stable_seconds,
        quiet_seconds=args.quiet_seconds,
        gnss_streak_target=max(args.gnss_streak_target, 1),
    )

    if args.json:
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    else:
        print(f"port={result.port} final_status={result.final_status}")
        for item in result.iterations:
            print(f"#{item.iteration} status={item.status} action={item.action}")

    if result.final_status in {"fatal", "unstable", "serial-error", "stable-no-gnss", "timeout"}:
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
