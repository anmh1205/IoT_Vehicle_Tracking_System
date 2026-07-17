## Code Review Summary

### Scope
- Files: main/src/power_mgr.c, main/inc/modem_at.h, main/src/modem_at.c, main/src/modem_lte.c
- Focus: correctness, regressions, safety; reset polarity + UART inversion sweep
- Scout findings: dependents primarily in main/src/state_machine.c network bring-up path (`modem_lte_request_connect` + `modem_lte_tick` loop)

### Critical
- None found.

### High
1. Runtime regression risk: AT transport settings are forcibly reset to default after successful sync/connection.
   - File: `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_lte.c`
   - Lines: 591-595 (also repeated in 231-234, 260-263, 672-675)
   - Impact: If board/wiring needs swapped pins or RX inversion, link can become unstable right after connect; later AT commands (`sleep/wakeup/rssi/disconnect`) may fail intermittently despite `s_lte_connected=true`.

### Medium
1. AT response completion heuristic can false-positive on trailing `OK` substring in non-terminal text.
   - File: `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
   - Lines: 85-90
   - Impact: may return early on some modem payloads/URCs ending with `...OK` even when canonical terminator is not yet complete.

2. No synchronization around dynamic UART reconfiguration APIs.
   - File: `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/src/modem_at.c`
   - Lines: 236-251, 258-270, 281-296
   - Impact: if called concurrently with `modem_at_send`, possible transient framing/read corruption. Current call path seems mostly single-threaded, but API is global.

### Reset polarity verdict
- Logical fix is correct for inverting transistor stage.
- Evidence:
  - comment defines assertion as modem RESET low via transistor when MCU HIGH: power_mgr.c:25-28
  - asserted path drives GPIO=1: power_mgr.c:33
  - init deasserts reset: power_mgr.c:99
  - pulse sequence now assert then deassert: power_mgr.c:185-187

### UART inversion sweep state-bug verdict
- Sweep sequencing itself is mostly coherent (baud -> inverse -> pin, then recover).
- Main state bug is post-success reversion to default UART settings (high issue above), which can invalidate the successful discovered config.
- No hard index overflow bug seen in baud/pin/inversion counters within this file.

### Recommended actions
1. Persist and keep the discovered working UART tuple (tx/rx/baud/inverse) after AT sync success; do not force reset to defaults on connected path.
2. Only restore defaults on explicit factory-reset path, not on normal connect/recover/disconnect.
3. Tighten AT completion detection to canonical line-terminated markers (`\r\nOK\r\n`, `\r\nERROR\r\n`, `+CME ERROR`) or parse line tokens.
4. Guard UART reconfiguration with the AT mutex (or dedicated config lock) to avoid concurrent reconfigure/send races.

### Unresolved questions
- Is hardware policy intentionally “always revert to default UART after bring-up” for compatibility with other modules? If yes, which module guarantees re-applying discovered settings before next AT transaction?
