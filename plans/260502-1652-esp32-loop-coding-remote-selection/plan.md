---
title: "ESP32 loop coding remote selection"
description: "Minimal plan to add first-run local/remote and COM selection with SSH-based remote ESP32 access."
status: pending
priority: P2
effort: 3h
branch: feat/audit-20260501
tags: [planning, esp32, skill, ssh]
created: 2026-05-02
---

# Overview
- Goal: keep current local flow intact, add optional remote path via SSH to machine A.
- Strategy: SKILL.md owns first-use prompts; existing Python scripts gain optional remote execution args and JSON passthrough.
- Constraint: no large refactor, no COM tunneling, no new orchestration layer unless forced.

# Phases
1. `phase-01-update-esp32-loop-coding-for-remote-selection.md` — define UX, config, script changes, tests.

# Likely files
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/SKILL.md`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/.env.example`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/com_detector.py`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/serial_reader.py`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/wait_and_flash.py`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/loop_runner.py`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/tests/test_com_detector.py`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/tests/test_serial_reader.py`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/tests/test_wait_and_flash.py`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/.claude/skills/esp32-loop-coding/scripts/tests/test_loop_runner.py`

# Dependencies
- SSH from Windows host to machine A works with existing key.
- Machine A has repo/skill/scripts and serial access.
