# Platform

`platform_clock.h` provides monotonic uptime in milliseconds. Any task can read it.
`platform_reset.h` logs the restart reason at the point where a task requests an ESP32 reset.
`platform_err.h` maps ESP-IDF results at I/O boundaries in implementation files.

The three corresponding files in `src/` hold all SDK calls. Board allocation errors keep the board API's existing I/O error mapping.
