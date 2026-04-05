#!/usr/bin/env python3
"""Analyze ESP32 serial log and classify status."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

FATAL_PATTERNS = [
    "Guru Meditation Error",
    "panic",
    "abort()",
    "assert failed",
    "Backtrace:",
]

BOOT_PATTERNS = ["Loaded app", "Calling app_main", "app_main", "TRACKER_MAIN: Boot"]
ERROR_PATTERN = "E ("


@dataclass
class AnalyzeResult:
    status: str
    fatal_count: int
    error_count: int
    boot_count: int
    matched_fatals: list[str]


def analyze_lines(lines: list[str]) -> AnalyzeResult:
    matched_fatals: list[str] = []
    fatal_count = 0
    error_count = 0
    boot_count = 0

    for raw_line in lines:
        line = raw_line.strip()
        if any(pattern in line for pattern in BOOT_PATTERNS):
            boot_count += 1
        if ERROR_PATTERN in line:
            error_count += 1

        for pattern in FATAL_PATTERNS:
            if pattern in line:
                fatal_count += 1
                matched_fatals.append(line)
                break

    if fatal_count > 0:
        status = "fatal"
    elif error_count > 0:
        status = "unstable"
    elif boot_count > 0:
        status = "stable"
    else:
        status = "unknown"

    return AnalyzeResult(
        status=status,
        fatal_count=fatal_count,
        error_count=error_count,
        boot_count=boot_count,
        matched_fatals=matched_fatals[:10],
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Analyze ESP32 serial log")
    parser.add_argument("--from-file", required=True, help="Path to log file")
    parser.add_argument("--tail-lines", type=int, default=800, help="Analyze last N lines")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    file_path = Path(args.from_file)
    if not file_path.exists():
        print(f"Log file not found: {file_path}")
        return 2

    lines = file_path.read_text(encoding="utf-8", errors="replace").splitlines()
    tail = lines[-args.tail_lines :] if args.tail_lines > 0 else lines
    result = analyze_lines(tail)

    if args.json:
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    else:
        print(f"status={result.status}")
        print(f"fatal={result.fatal_count} error={result.error_count} boot={result.boot_count}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
