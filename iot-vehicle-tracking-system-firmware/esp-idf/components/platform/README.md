# Platform

Use `include/platform/platform.h` for shared ESP-IDF services. `platform.c` provides monotonic uptime in milliseconds, restart with a reason and SDK error translation. `platform_rtos.c` supplies task delays, millisecond-to-tick conversion and task-context mutexes.

The RTOS implementation preserves native rounding and the established indefinite waits. The public mutex type is opaque. Firmware adapters own the lifetime of their mutexes and keep file, UART and event delivery outside bounded snapshot-copy sections.
