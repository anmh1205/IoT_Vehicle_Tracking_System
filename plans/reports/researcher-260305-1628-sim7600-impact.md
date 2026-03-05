# Researcher Report — SIM7600CE-T impact

## 1. Canonical firmware touchpoints
- `iot-vehicle-tracking-firmware/main/src/modem_lte.c`: LTE bring-up and PDP/registration flow (líneas ~34-77).
- `iot-vehicle-tracking-firmware/main/src/modem_gnss.c`: GNSS commands (`AT+CGNSPWR`, `AT+CGNSINF`) and parser (líneas 46-114).
- `iot-vehicle-tracking-firmware/main/src/modem_at.c`: shared UART driver + AT engine (líneas 55-154).
- `iot-vehicle-tracking-firmware/main/src/state_machine.c`: lifecycle hooks that call `modem_gnss_*`, `modem_lte_*`, and power manager (líneas 214-244).
- `iot-vehicle-tracking-firmware/main/inc/pin_map.h`: pin assignments for UART, PWRKEY, modem-related GPIO (líneas 6-20).
- `iot-vehicle-tracking-firmware/main/src/power_mgr.c`: `modem_power_key_pulse` and GPIO setup (líneas 13-73).

## 2. Current assumptions tied to A7670C+NEO-M8N vs integrated modem
1. `modem_gnss.c` relies on A7670C-style `AT+CGNS*` commands, implying GNSS is accessed via the cellular modem UART rather than an external NEO-M8N UART stream (líneas 46-114).
2. `state_machine_try_connect_network` always powers GNSS (`modem_gnss_power_on()`) immediately after LTE connect, so the firmware expects a single module providing both functions (líneas 214-244).
3. `pin_map.h` exposes only one UART (`PIN_MODEM_TX/RX`) and a `PIN_MODEM_PWRKEY`, with no separate GNSS UART, indicating board layout assumes integrated GNSS or a single shared modem (líneas 6-19).
4. The LTE flow in `modem_lte.c` configures `CNMP`, `CGDCONT`, `CREG`, etc., matching SIMCom modem command set; no GNSS-specific UART control is present (líneas 34-76).

## 3. Minimum changes to target SIM7600CE-T
| File | Change | Reference lines |
| --- | --- | --- |
| `modem_lte.c` | Validate/adjust AT sequence to meet SIM7600CE-T defaults (network mode, PDP, sleep) and update any mode-specific commands (`AT+CNMP`, `AT+CFUN`, `PDP`). | 34-77 |
| `modem_gnss.c` | Confirm SIM7600CE-T exposes identical `AT+CGNS*` syntax; update parser if field order or satellite count fields differ in `%s`. Keep GNSS enable/disable via same UART. | 46-114 |
| `modem_at.c` | Ensure UART configuration and flow control match SIM7600CE-T wiring (CTS/RTS if used). Shortcut: keep `MODEM_UART_NUM` and `MODEM_UART_BAUD` unless new board wiring uses different pins. | 55-154 |
| `power_mgr.c` | Adjust `modem_power_key_pulse` timing/polarity if SIM7600 requires different pulse length or additional reset line (some variants use `RESET` or `PWRKEY` combos). | 13-72 |
| `pin_map.h` | Update pin defines to match new SIM7600CE-T breakout: e.g., assign modem UART to the actual pins, add `PIN_MODEM_RESET`/`PIN_MODEM_PWRKEY` or optional `PIN_MODEM_STATUS` if hardware exposes them. | 6-20 |
| `state_machine.c` | Re-verify that `modem_gnss_power_on/off` still valid for SIM7600 (some SIM7600 boards provide GNSS power via `AT+CGNSPWR` or separate enable). If hardware uses module power rail, ensure power manager toggles it (call `modem_power_off` covers the new board). | 214-244 |

## 4. Payload / backend interface
- `data_formatter.c` (líneas 21-118) already exposes `latitude`, `longitude`, `speed`, `course`, `satellites`, `ignition`, `error_code`. GNSS source swap is internal—no schema change. Backend interface unchanged as long as GNSS parser continues to populate the same telemetry struct.

## 5. Pin map / hardware abstraction impact
- Current mapping only defines `PIN_MODEM_TX/RX` and `PIN_MODEM_PWRKEY` (no GNSS UART). If SIM7600CE-T board reuses the same UART and power key, no code change needed.
- If the new board exposes additional signals (CTS/RTS, `RESET`, `STAT`), extend `pin_map.h` and adjust `modem_at.c`/`power_mgr.c` accordingly. Keep abstraction minimal (only add what is wired).
- Ensure `power_mgr_init` configures any new GPIO needed for SIM7600 power gating or status monitoring.

## Next steps
1. Inspect SIM7600CE-T schematic to confirm UART pins and power key wiring.
2. Compare AT command manual with current sequences (`CGNS*`, `CNMP`, `CGDCONT`).
3. Update pin_map/power_mgr only if wiring differs; otherwise, reuse existing definitions to honor KISS/YAGNI.

## Unresolved questions
- Does the SIM7600CE-T breakout require additional control pins (RESET, STATUS) beyond the existing `PWRKEY`?
- Are there any timing differences for `PWRKEY` pulses vs. the current `modem_power_key_pulse` implementation?
