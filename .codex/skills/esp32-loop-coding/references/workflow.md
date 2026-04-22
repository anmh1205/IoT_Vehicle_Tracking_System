# ESP32 Loop Workflow

## Prerequisites

- ESP-IDF environment can be loaded from PowerShell or CMD.
- Firmware directory is `iot-vehicle-tracking-system-firmware`.
- Python has `pyserial`.
- Serial port access is available.

## Session start

1. Detect ports with `scripts/com_detector.py --json`.
2. If there is one port, use it.
3. If there are multiple ports, ask once and keep that COM for the whole session.
4. Pin the log file:
   - `iot-vehicle-tracking-system-firmware/documents/test-logs/com{N}-monitor-latest.log`

## Normal iteration

1. Monitor serial with `scripts/serial_reader.py`.
2. Stop monitoring when:
   - a fatal pattern appears, or
   - the system is stable for the configured window.
3. Analyze the captured log slice with `scripts/log_analyzer.py`.
4. If the device sleeps and the USB port disappears during monitoring:
   - keep the same log file
   - let `serial_reader.py` retry and append reconnect markers
   - treat resumed runtime lines such as `STATE_MACHINE`, `MODEM_GNSS`, heartbeat status, and HW diag as valid stability signals even if boot banners are absent
5. If status is `fatal` or `unstable`:
   - fix the real code
   - run `idf.py build`
   - run `idf.py -p <COM> flash`
6. Monitor again to confirm behavior.
7. Finish when the requested stability criteria are met.

## Native USB recovery branch

Use this when the board is ESP32-S3 native `USB Serial/JTAG` and the port:
- disappears during sleep
- returns `serial-error`
- intermittently fails to open on Windows

Recommended flow:
1. Build first:
   - `idf.py build`
2. Arm the wait:
   - `python <skill-root>/scripts/wait_and_flash.py --port COM5 --firmware-dir iot-vehicle-tracking-system-firmware --flash-method auto --max-wait-seconds 600 --json`
3. The script polls until the COM is both enumerated and openable.
4. In `auto` mode it prefers direct `esptool` from `build/flasher_args.json`, so flash starts with less overhead than `idf.py flash`.
5. Return to `serial_reader.py` or `loop_runner.py` for post-flash verification.

Why split build and flash:
- `build flash` is too slow for a short wake window.
- native USB boards can disappear again before flash starts.
- prebuilding keeps the critical section short.

## Notes

- Keep appending to `com{N}-monitor-latest.log` to preserve history.
- Do not change COM mid-session unless the port identity itself changes.
- Prefer small fixes and immediate re-measurement.
- Treat `serial-error` as a workflow branch, not only as a cable problem.
