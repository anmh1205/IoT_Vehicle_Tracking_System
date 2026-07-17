#!/usr/bin/env python3
"""Load env vars from ordered .env files for skill scripts."""

from __future__ import annotations

import os
from pathlib import Path


def _parse_env_file(file_path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not file_path.exists() or not file_path.is_file():
        return values

    for raw in file_path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            values[key] = value
    return values


def load_skill_env(skill_name: str, cwd: str | None = None) -> dict[str, str]:
    """Load env with priority: process.env > CWD files > HOME files."""
    home = Path.home()
    current = Path(cwd or os.getcwd())

    ordered_files = [
        home / ".claude" / ".env",
        home / ".claude" / "skills" / ".env",
        home / ".claude" / "skills" / skill_name / ".env",
        current / ".claude" / ".env",
        current / ".claude" / "skills" / ".env",
        current / ".claude" / "skills" / skill_name / ".env",
    ]

    merged: dict[str, str] = {}
    for env_file in ordered_files:
        merged.update(_parse_env_file(env_file))

    for key, value in merged.items():
        os.environ.setdefault(key, value)
    return merged
