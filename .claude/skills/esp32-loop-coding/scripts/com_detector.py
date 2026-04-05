#!/usr/bin/env python3
"""Detect available serial COM ports for ESP32 workflows."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass

from serial.tools import list_ports


@dataclass
class PortInfo:
    device: str
    description: str
    hwid: str
    vid: int | None
    pid: int | None


def detect_ports() -> list[PortInfo]:
    ports: list[PortInfo] = []
    for port in list_ports.comports():
        ports.append(
            PortInfo(
                device=port.device,
                description=port.description or "",
                hwid=port.hwid or "",
                vid=port.vid,
                pid=port.pid,
            )
        )
    return ports


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Detect serial COM ports")
    parser.add_argument("--json", action="store_true", help="Output JSON")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    ports = detect_ports()

    if args.json:
        print(json.dumps([asdict(port) for port in ports], ensure_ascii=False, indent=2))
        return 0

    if not ports:
        print("No serial ports detected")
        return 0

    for idx, port in enumerate(ports, start=1):
        print(f"{idx}. {port.device} | {port.description} | {port.hwid}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
