# Stop Conditions for Serial Monitor

## Goal

Stop early once there is enough signal to decide whether to fix, recover, or pass.

## Fatal stop

Stop immediately when one of these appears:
- `Guru Meditation Error`
- `panic`
- `abort()`
- `assert failed`
- `Backtrace:`

## Error stop

By default stop when ESP-IDF error logs appear:
- `E (xxxx) TAG: ...`

This keeps the loop tight instead of waiting for the full timeout.

## Stable stop

Treat the session as stable when:
- a boot or app signal appears (`Loaded app`, `app_main`, `Calling app_main`), and
- no new fatal or unstable signal appears during `stable_seconds`.

Also treat the session as stable when monitoring attaches after boot but there is sustained runtime activity without fatal or unstable lines, for example:
- `STATE_MACHINE: mqtt status=heartbeat`
- `STATE_MACHINE: HW diag ...`
- `MODEM_GNSS: ...`

## Serial error stop

Treat `serial-error` as a separate stop condition.

Interpretation:
- If the board is a UART bridge device, inspect cable, driver, or port ownership.
- If the board is ESP32-S3 native `USB Serial/JTAG`, first suspect sleep or USB re-enumeration and switch to `wait_and_flash.py`.
- During normal monitoring, prefer letting `serial_reader.py` retry through sleep interruptions so one log captures the full timeline before deciding the session is truly broken.

## Timeout stop

If none of the conditions above are met before `max_seconds`, stop with `timeout`.

## Practical defaults

- `max_seconds=120`
- `stable_seconds=20`
- `quiet_seconds=3`

## Interpretation

- `fatal` -> fix immediately, build, flash, monitor again
- `unstable` -> fix the failing module, build, flash, monitor again
- `serial-error` -> use wait-and-flash for native USB boards, otherwise check host-side serial access
- `stable` -> finish this debug loop or move to the next validation case
