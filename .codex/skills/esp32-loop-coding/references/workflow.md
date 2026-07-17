# ESP32 Loop Workflow

## Prerequisites

- ESP-IDF environment can be loaded from PowerShell or CMD.
- Firmware directory is `iot-vehicle-tracking-system-firmware`.
- Python has `pyserial`.
- Serial port access is available.

## Session start

1. Ask once whether the session runs `local` or `remote`.
2. If `remote`, ask once for SSH host, SSH user, SSH private key path, and whether flash will use copied artifacts from machine B or a separate manual mirrored-repo flow on machine A. Reuse `./.claude/skills/esp32-loop-coding/.env` defaults first when present; repo-local skill env overrides HOME-level skill env.
3. Detect ports for the chosen mode:
   - local: `scripts/com_detector.py --json`
   - remote: `scripts/remote-esp32.py detect --json`
4. If there are `0` ports, stop and ask for the board to be connected.
5. If there is one port, use it.
6. If there are multiple ports, ask once and keep that COM for the whole session.
7. Pin the log file:
   - `iot-vehicle-tracking-system-firmware/documents/test-logs/com{N}-monitor-latest.log`
   - in remote mode, keep logs on machine B by default and append remote SSH stdout into the same file

## Normal iteration

1. Monitor serial for the chosen mode:
   - local: `scripts/serial_reader.py`
   - remote: `scripts/remote-esp32.py monitor --port COM13 --seconds 120` and append stdout into the same local log file on machine B
2. Stop monitoring when:
   - a fatal pattern appears, or
   - the system is stable for the configured window
3. Analyze the captured log slice with `scripts/log_analyzer.py`.
4. If the device sleeps and the USB port disappears during monitoring:
   - keep the same log file
   - let `serial_reader.py` retry and append reconnect markers in local mode
   - in remote mode, let `remote-esp32.py monitor` probe, reopen, and keep appending into the same local log file
   - treat resumed runtime lines such as `STATE_MACHINE`, `MODEM_GNSS`, heartbeat status, and HW diag as valid stability signals even if boot banners are absent
5. If status is `fatal` or `unstable`:
   - fix the real code
   - run `idf.py build` on machine B
   - flash on the chosen mode: local direct flash, or `scripts/remote-esp32.py flash --port COM13 --flasher-args iot-vehicle-tracking-system-firmware/build/flasher_args.json --json` on machine A
   - if remote flash uses machine B artifacts, copy the required `build/` outputs or specific `.bin` files to machine A before flashing
   - if you need mirrored-repo `idf.py flash` on machine A, treat that as a separate manual fallback outside the helper
6. Monitor again to confirm behavior.
7. Finish when the requested stability criteria are met.

## Native USB recovery branch

Use this when the board is ESP32-S3 native `USB Serial/JTAG` and the port:
- disappears during sleep
- returns `serial-error`
- intermittently fails to open on Windows
- fails remote flash with `No serial data received`, `PermissionError`, or device error 31

Recommended flow:
1. Build first:
   - `idf.py build`
2. Arm the wait:
   - local: `python <skill-root>/scripts/wait_and_flash.py --port COM5 --firmware-dir iot-vehicle-tracking-system-firmware --flash-method auto --max-wait-seconds 600 --json`
   - remote: `python <skill-root>/scripts/remote-esp32.py flash --port COM13 --flasher-args iot-vehicle-tracking-system-firmware/build/flasher_args.json --json`
3. The helper polls until the COM is both enumerated and openable.
4. Remote flash retries automatically when native USB reconnects but the first open/attach still fails transiently.
5. Return to `serial_reader.py`, `remote-esp32.py monitor`, or `loop_runner.py` for post-flash verification.

## Notes

- Keep appending to `com{N}-monitor-latest.log` to preserve history.
- Ask about `local` vs `remote` only once per session, then keep reusing the same mode.
- Do not change COM mid-session unless the port identity itself changes.
- In remote mode, keep reusing the same SSH host, user, key path, and COM unless the user explicitly changes them.
- Prefer small fixes and immediate re-measurement.
- Treat `serial-error` as a workflow branch, not only as a cable problem.
