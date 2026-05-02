---
name: esp32-loop-coding
description: "Run an ESP32 firmware debug loop: detect COM, monitor serial, analyze logs, fix code, build, and wait-and-flash native USB boards that sleep."
license: MIT
version: 1.3.0
---

# ESP32 Loop Coding

## Overview

Use this skill for a real ESP32 firmware debug loop:
- ask once whether the session runs `local` or `remote`
- ask once which COM port to use when more than one candidate exists
- detect the right COM port for the chosen mode
- monitor serial until the session is stable or broken
- analyze logs
- fix the real code
- build and flash again

Remote mode means:
- the agent runs on machine B
- the ESP32 device is connected to machine A
- flash and monitor happen on machine A over SSH
- logs still append into the local repo on machine B unless the user explicitly asks to keep them on machine A

For ESP32-S3 boards that use native `USB Serial/JTAG`, add the `wait-and-flash` branch when sleep or flaky USB makes the port disappear or return Windows `PermissionError 31`.

## When to use

Activate this skill when the task includes one or more of these:
- "loop debug", "flash then read serial again", "fix until boot is stable"
- keep continuous logs in `iot-vehicle-tracking-system-firmware/documents/test-logs/`
- choose the correct COM port without guessing
- recover a native USB board that sleeps and only exposes a short flash window

## Session bootstrap

1. Confirm the firmware directory: `iot-vehicle-tracking-system-firmware`.
2. Ask once whether this session runs `local` or `remote`.
3. If the mode is `remote`, ask once for:
   - SSH host
   - SSH user
   - SSH private key path
   - whether remote flash will use copied build artifacts from machine B or a separate manual mirrored-repo flow on machine A
   - if the repo has `./.claude/skills/esp32-loop-coding/.env`, those repo-local defaults override HOME-level skill env files
4. Detect serial ports for the chosen mode:
   - local: `python <skill-root>/scripts/com_detector.py --json`
   - remote: `python <skill-root>/scripts/remote-esp32.py detect --json`
   - the helper auto-loads host, user, key path, VID, PID, and timeout defaults from skill `.env`
5. Apply COM selection rules:
   - `0` ports: stop and ask for the board to be connected
   - `1` port: use it
   - `>1` ports: ask once, then keep that COM for the session
6. Choose the log file:
   - `iot-vehicle-tracking-system-firmware/documents/test-logs/com{N}-monitor-latest.log`
   - in remote mode, keep this log on machine B by default and append remote serial output into it via SSH stdout

`<skill-root>` is either `.codex/skills/esp32-loop-coding` or `.claude/skills/esp32-loop-coding`.

## Standard loop

1. Read serial for the chosen mode until:
   - local: use `serial_reader.py`
   - remote: use `remote-esp32.py monitor` and append raw stdout into the same local log file on machine B
   - a fatal or unstable signal appears, or
   - the system is stable for the required window.
   - When sleep or native USB re-enumeration interrupts the port, keep the same log file and continue the same session after the port becomes usable again.
2. Analyze the newest log slice with `log_analyzer.py`.
3. If the session is fatal or unstable:
   - fix the real source code
   - build with ESP-IDF from PowerShell/CMD on machine B
   - flash again on the chosen mode
4. If the session is stable:
   - stop the loop
5. If the port fails because native USB is sleeping or re-enumerating:
   - local mode: switch to `wait_and_flash.py`
   - remote mode: wait for the COM to become openable on machine A, then flash immediately over SSH
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

## Remote SSH branch

Use this branch only when the ESP32 is physically attached to machine A and the agent runs on machine B.

Recommended remote flow:
1. Reuse the SSH host, SSH user, SSH private key path, and chosen COM captured during session bootstrap.
2. Keep logs on machine B unless the user explicitly wants logs on machine A.
3. Build on machine B first.
4. Flash and monitor on machine A over SSH.
5. Reuse the same SSH host, key, and COM for the whole loop.

Remote monitor template:
- `python <skill-root>/scripts/remote-esp32.py monitor --port COM13 --seconds 120 | tee -a iot-vehicle-tracking-system-firmware/documents/test-logs/com13-monitor-latest.log`
- The helper uses PowerShell `-EncodedCommand`, so it avoids the Bash → SSH → PowerShell quoting failures that happen with raw inline commands.
- The helper streams raw serial lines only; it does not add reconnect markers like `serial_reader.py`.
- Append stdout into `com{N}-monitor-latest.log` on machine B, then analyze it with `log_analyzer.py` exactly like local mode.

Remote flash templates:
- Helper-supported path:
  - copy the required `build/` outputs or specific `.bin` files from machine B to machine A first with `scp`
  - then run `python <skill-root>/scripts/remote-esp32.py flash --port COM13 --flasher-args iot-vehicle-tracking-system-firmware/build/flasher_args.json`
- Manual fallback path:
  - if machine A already has a mirrored firmware repo and ESP-IDF, you can still run a separate remote `idf.py flash` flow outside the helper
- The helper defaults match the proven machine A setup in the repo-local `.env`: `D:/ESP_IDF/.../python.exe`, `.../esptool.py`, `C:/Users/anmh1/esp32-remote-flash`, and preferred VID/PID `303A:1001`.
- Do not start a long remote build inside the short native USB wake window.

## Command templates

- Local monitor and append to log:
  - `python <skill-root>/scripts/serial_reader.py --port COM6 --baud 115200 --log-file iot-vehicle-tracking-system-firmware/documents/test-logs/com6-monitor-latest.log --max-seconds 120 --stable-seconds 20 --quiet-seconds 3 --json`
- Analyze the latest log:
  - `python <skill-root>/scripts/log_analyzer.py --from-file iot-vehicle-tracking-system-firmware/documents/test-logs/com6-monitor-latest.log --tail-lines 800 --json`
- Run the basic local loop:
  - `python <skill-root>/scripts/loop_runner.py --firmware-dir iot-vehicle-tracking-system-firmware --max-iterations 8 --json`
- Wait for a flaky native USB port and flash immediately in local mode:
  - `python <skill-root>/scripts/wait_and_flash.py --port COM5 --firmware-dir iot-vehicle-tracking-system-firmware --flash-method auto --max-wait-seconds 600 --probe-interval-ms 500 --json`
- Detect remote COM ports:
  - `python <skill-root>/scripts/remote-esp32.py detect --json`
- Monitor a remote port and append locally:
  - `python <skill-root>/scripts/remote-esp32.py monitor --port COM13 --seconds 120 | tee -a iot-vehicle-tracking-system-firmware/documents/test-logs/com13-monitor-latest.log`
- Flash a remote port from local `flasher_args.json`:
  - `python <skill-root>/scripts/remote-esp32.py flash --port COM13 --flasher-args iot-vehicle-tracking-system-firmware/build/flasher_args.json`

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
- Remote SSH helper: `scripts/remote-esp32.py`
- Script tests: `scripts/tests/`
