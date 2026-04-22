---
name: esp32-loop-coding
description: "Run an ESP32 firmware debug loop: detect COM, monitor serial, analyze logs, fix code, build, and wait-and-flash native USB boards that sleep."
license: MIT
version: 1.1.0
---

# ESP32 Loop Coding

## Overview

Use this skill for a real ESP32 firmware debug loop:
- detect the right COM port
- monitor serial until the session is stable or broken
- analyze logs
- fix the real code
- build and flash again

For ESP32-S3 boards that use native `USB Serial/JTAG`, add the `wait-and-flash` branch when sleep or flaky USB makes the port disappear or return Windows `PermissionError 31`.

## When to use

Activate this skill when the task includes one or more of these:
- "loop debug", "flash then read serial again", "fix until boot is stable"
- keep continuous logs in `iot-vehicle-tracking-system-firmware/documents/test-logs/`
- choose the correct COM port without guessing
- recover a native USB board that sleeps and only exposes a short flash window

## Session bootstrap

1. Confirm the firmware directory: `iot-vehicle-tracking-system-firmware`.
2. Detect serial ports:
   - `python <skill-root>/scripts/com_detector.py --json`
3. Apply COM selection rules:
   - `0` ports: stop and ask for the board to be connected
   - `1` port: use it
   - `>1` ports: ask once, then keep that COM for the session
4. Choose the log file:
   - `iot-vehicle-tracking-system-firmware/documents/test-logs/com{N}-monitor-latest.log`

`<skill-root>` is either `.codex/skills/esp32-loop-coding` or `.claude/skills/esp32-loop-coding`.

## Standard loop

1. Read serial with `serial_reader.py` until:
   - a fatal or unstable signal appears, or
   - the system is stable for the required window.
   - When sleep or native USB re-enumeration interrupts the port, the monitor keeps the same session alive, retries the port, and appends reconnect markers into the same log file.
2. Analyze the newest log slice with `log_analyzer.py`.
3. If the session is fatal or unstable:
   - fix the real source code
   - build with ESP-IDF from PowerShell/CMD
   - flash again
4. If the session is stable:
   - stop the loop
5. If the port fails because native USB is sleeping or re-enumerating:
   - switch to `wait_and_flash.py`
   - wait for the COM to become openable
   - flash immediately when the port is usable
   - return to serial monitoring

## Native USB wait-and-flash

Use this branch for ESP32-S3 native `USB Serial/JTAG` boards when:
- the port disappears during sleep
- Windows reports `A device attached to the system is not functioning.`
- `serial_reader.py` or `loop_runner.py` ends with `serial-error`

For normal monitoring after flash, `serial_reader.py` already tolerates sleep and reconnect. Use `wait_and_flash.py` specifically for the flash race window, not as a replacement for regular monitoring.

Important rule: build before arming the wait. Do not use `build flash` inside the short wake window.
`wait_and_flash.py` now defaults to `--flash-method auto`, which prefers direct `esptool` from `build/flasher_args.json` and only falls back to `idf.py` when the direct path cannot be resolved.

Recommended sequence:
1. `idf.py build`
2. `python <skill-root>/scripts/wait_and_flash.py --port COM5 --firmware-dir iot-vehicle-tracking-system-firmware --flash-method auto --max-wait-seconds 600 --json`
3. After flash, go back to `serial_reader.py` or `loop_runner.py`

## Command templates

- Monitor serial and append to log:
  - `python <skill-root>/scripts/serial_reader.py --port COM6 --baud 115200 --log-file iot-vehicle-tracking-system-firmware/documents/test-logs/com6-monitor-latest.log --max-seconds 120 --stable-seconds 20 --quiet-seconds 3 --json`
- Analyze the latest log:
  - `python <skill-root>/scripts/log_analyzer.py --from-file iot-vehicle-tracking-system-firmware/documents/test-logs/com6-monitor-latest.log --tail-lines 800 --json`
- Run the basic loop:
  - `python <skill-root>/scripts/loop_runner.py --firmware-dir iot-vehicle-tracking-system-firmware --max-iterations 8 --json`
- Wait for a flaky native USB port and flash immediately:
  - `python <skill-root>/scripts/wait_and_flash.py --port COM5 --firmware-dir iot-vehicle-tracking-system-firmware --flash-method auto --max-wait-seconds 600 --probe-interval-ms 500 --json`

## ESP-IDF command policy on Windows

- Do not run `idf.py` directly from Git Bash/MSYS.
- Use PowerShell:
  - `powershell -NoProfile -ExecutionPolicy Bypass -Command "& 'C:\Espressif\esp-idf-v5.5.3\export.ps1'; Set-Location 'E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-firmware'; idf.py build"`
- Or use CMD:
  - `cmd.exe /c "cd /d E:\anmh1205\IoT_Vehicle_Tracking_System\iot-vehicle-tracking-system-firmware && call C:\Espressif\esp-idf-v5.5.3\export.bat && idf.py build"`

## Guardrails

- Ask for COM selection only when multiple ports exist and there is no session COM yet.
- Flash only after code was changed or a prebuilt image is ready.
- Always append to `com{N}-monitor-latest.log` so the session history stays intact.
- `serial_reader.py` writes markers such as `serial unavailable`, `serial disconnect`, and `serial reconnect` so one log file preserves the full sleep/wake timeline.
- For native USB sleep boards, separate `build` from `flash` so the ready window is not wasted.
- After every wait-and-flash recovery, monitor serial again to confirm behavior.

## Resources

- Detailed workflow: `references/workflow.md`
- Serial stop conditions: `references/stop-conditions.md`
- COM detection script: `scripts/com_detector.py`
- Serial monitor script: `scripts/serial_reader.py`
- Log analyzer script: `scripts/log_analyzer.py`
- Loop runner script: `scripts/loop_runner.py`
- Wait-and-flash script: `scripts/wait_and_flash.py`
- Script tests: `scripts/tests/`
