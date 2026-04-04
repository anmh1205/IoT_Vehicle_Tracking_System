# Research Report: ESP32-S3 + SIM7600 firmware patterns

**Timestamp:** 2026-04-04 16:37 Asia/Saigon

## Executive Summary

Không có 1 repo/community source nào bao phủ trọn bộ ESP32-S3 + SIM7600 + GNSS + low-power + IMU wake + watchdog. Pattern đúng là ghép nhiều nguồn: vendor docs cho UART/sleep/WDT, community repo cho SIM7600 AT handling, GNSS helper, và issue thread cho failure modes thực tế.

Khuyến nghị ngắn: dùng `esp_modem` nếu firmware ESP-IDF, `TinyGSM`/wrapper nếu Arduino/PlatformIO, GNSS parse dạng stream (không parse từng mẩu rời), tách modem IO khỏi application state machine, và thiết kế recovery theo timeout/backoff + reset modem + reset task/system.

## Research Methodology

- Sources consulted: 8+
- Date range of materials: 2024-2026 (search results + docs pages, issue threads)
- Key search terms used:
  - ESP32-S3 SIM7600 AT handling
  - SIM7600 GNSS parsing low power watchdog
  - esp_modem SIM7600 ESP32-S3
  - TinyGSM SIM7600 GPS
  - SIM7600 sleep mode DTR CSCLK
  - ESP32 UART sleep watchdog docs

## Key Findings

### 1. Technology Overview

**Vendor anchor**
- Espressif `esp_modem` docs show the intended modem abstraction and customization path for SIM7600-style AT control.
- ESP-IDF UART docs provide the right event-driven model for robust RX handling on ESP32-S3.
- ESP-IDF sleep + watchdog docs define the platform-level recovery primitives.

**Community anchor**
- `Hard-Stuff/piolib-SIM7600` is the closest practical all-in-one SIM7600 wrapper found; it states ESP32-S3 + SIM7600G testing for OTA/MQTT/HTTP.
- `TinyGSM` is the widest-used modem abstraction in community codebases.
- LilyGO issue threads capture real-world power and startup failures, especially around sleep current and modem not responding.

### 2. Current State & Trends

- 2025-2026 community pattern: use a dedicated modem task + UART queue + command timeout; avoid mixing modem IO into business logic.
- Low-power behavior is still hardware-sensitive; SIM7600 sleep often behaves differently on bench vs. datasheet expectation.
- GNSS parsing trend is stable: treat NMEA as stream input and hand it to a parser library instead of manual slicing.
- Watchdog/recovery is moving from “reboot on failure” toward layered recovery: command retry, modem reset, task watchdog, then full system reset.

### 3. Best Practices

1. **Dedicated AT task**
   - One task owns UART + modem state.
   - Other tasks send requests through queue.
   - Why: prevents interleaved AT responses and race conditions.

2. **Per-command timeout + bounded retry/backoff**
   - Use timeout per AT command.
   - Retry with exponential or capped linear backoff.
   - Why: modem sometimes stalls after power transitions or network loss.

3. **Stream parser for GNSS**
   - Read NMEA continuously; validate checksum; parse via library.
   - Why: GNSS data arrives fragmented and timing-sensitive.

4. **Explicit modem state machine**
   - States like INIT, SYNC, READY, GNSS_ON, TX, SLEEP, RECOVER.
   - Why: makes reset/retry paths deterministic.

5. **Power sequencing discipline**
   - Follow modem sleep prerequisites (`CSCLK`, DTR, RF state, power pins).
   - Why: sleep current mismatch is common in community reports.

6. **Motion wake via IMU interrupt**
   - Use wake-capable GPIO from IMU interrupt.
   - Keep IMU in low-power accel mode until motion.
   - Why: best fit for vehicle movement-triggered tracking.

7. **Watchdog on blocking paths**
   - Subscribe modem task to TWDT or equivalent.
   - Feed only when progress is real.
   - Why: retry loops can starve scheduler.

8. **Recovery ladder**
   - Retry command -> re-sync AT -> modem reset -> task restart -> system reboot.
   - Why: separates transient modem glitches from hard hangs.

9. **Persist last-known-good session data**
   - Save last fix time, last network state, reboot reason.
   - Why: helps post-failure recovery and diagnostics.

10. **Measure actual current on hardware**
   - Do not trust sleep assumptions.
   - Why: SIM7600 sleep often deviates from expected numbers.

### 4. Security Considerations

- AT interface is a privileged control path; never let untrusted payloads inject raw AT commands.
- Command payloads from backend should be allowlisted and schema-validated.
- OTA/download commands need integrity checks (`sha256`) and timeout limits.
- Keep recovery logs free of secrets; modem logs may contain IMSI/IMEI/phone numbers.

### 5. Performance Insights

- UART RX must be event-driven or buffered; polling increases latency and data loss risk.
- GNSS parsing should be incremental; full-string parsing wastes RAM and drops fragments.
- Retry backoff must be capped; aggressive loops increase power drain and watchdog risk.
- Sleep/wake should prefer coarse state transitions; frequent modem power cycling is expensive.

## Comparative Analysis

| Practice pattern | Repo evidence | Link | When to use | Risk |
|---|---|---|---|---|
| Dedicated SIM7600 wrapper on ESP32-S3 | `Hard-Stuff/piolib-SIM7600` says ESP32-S3 + SIM7600G tested | https://github.com/Hard-Stuff/piolib-SIM7600 | Arduino/PlatformIO projects needing quick modem integration | Wrapper may hide modem edge cases |
| AT sync/recovery focus | Espressif esp-protocols issue on SIM7600G-H + ESP32-S3 | https://github.com/espressif/esp-protocols/issues/352 | When modem init or AT sync fails | Issue-level evidence only, not a stable API contract |
| Power/sleep debugging | LilyGO SIM7600 sleep issue | https://github.com/Xinyuan-LilyGO/T-SIM7600X/issues/13 | When current draw stays high in sleep | Board-specific wiring/power path may mislead |
| OTA/download failure recovery | LilyGO SIM7670G OTA issue | https://github.com/Xinyuan-LilyGO/LilyGo-Modem-Series/issues/352 | When large transfers fail over modem | Failure may be network/provider dependent |
| Modem not responding boot path | LilyGO modem not responding issue | https://github.com/Xinyuan-LilyGO/LilyGo-Modem-Series/issues/346 | Startup diagnostics and watchdog policy | Symptom reports can mix hardware and firmware causes |
| Modem abstraction baseline | `esp_modem` customization/advanced docs | https://docs.espressif.com/projects/esp-protocols/esp_modem/docs/latest/customization.html | ESP-IDF projects wanting structured modem handling | Requires learning Espressif-specific APIs |
| UART event-driven RX | ESP-IDF UART docs | https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/uart.html | Any ESP32-S3 modem IO implementation | Polling code is easier but weaker |
| Sleep + WDT recovery primitives | ESP-IDF sleep/WDT docs | https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html / https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/wdts.html | Low-power + watchdog design | Misuse can cause false resets or missed wake events |

## Implementation Recommendations

### Quick Start Guide

1. Put modem IO in one task.
2. Use UART event queue or buffered reader.
3. Wrap each AT command with timeout + retry/backoff.
4. Parse GNSS as NMEA stream.
5. Add modem state machine and recovery ladder.
6. Wire IMU interrupt to wake-capable GPIO.
7. Add watchdog around modem task.
8. Validate sleep current on hardware.

### Code Examples

```text
INIT -> AT_SYNC -> READY -> GNSS_ON -> TRACKING -> SLEEP -> WAKE -> RECOVER
```

```pseudo
send(cmd)
wait(response, timeout)
if timeout:
  retry with backoff
if retries exhausted:
  resync modem
  reset modem power
  restart modem task
  if still failing: system reset
```

### Common Pitfalls

- Parsing AT replies in multiple tasks.
- Assuming modem sleep works without verifying DTR/CSCLK sequencing.
- Treating GNSS as one-shot text instead of stream data.
- Letting retry loops run forever.
- Using WDT as a substitute for actual recovery.
- Ignoring board-specific power circuitry.

## Resources & References

### Official Documentation
- [Espressif esp_modem customization](https://docs.espressif.com/projects/esp-protocols/esp_modem/docs/latest/customization.html)
- [Espressif esp_modem advanced API](https://docs.espressif.com/projects/esp-protocols/esp_modem/docs/latest/advanced_api.html)
- [ESP-IDF UART docs](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/peripherals/uart.html)
- [ESP-IDF sleep modes](https://docs.espressif.com/projects/esp-idf/en/latest/esp32s3/api-reference/system/sleep_modes.html)
- [ESP-IDF watchdogs](https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/system/wdts.html)
- [SIMCom technical files](https://www.simcom.com/technical_files.html)
- [SIM7600 product page](https://en.simcom.com/product/SIM7600NAG.html)

### Community Resources
- [TinyGSM](https://github.com/vshymanskyy/TinyGSM)
- [Hard-Stuff/piolib-SIM7600](https://github.com/Hard-Stuff/piolib-SIM7600)
- [LilyGO SIM7600 sleep issue](https://github.com/Xinyuan-LilyGO/T-SIM7600X/issues/13)
- [Espressif esp-protocols issue #352](https://github.com/espressif/esp-protocols/issues/352)
- [LilyGO modem OTA issue #352](https://github.com/Xinyuan-LilyGO/LilyGo-Modem-Series/issues/352)
- [LilyGO modem not responding issue #346](https://github.com/Xinyuan-LilyGO/LilyGo-Modem-Series/issues/346)
- [TinyGPSPlus](https://github.com/mikalhart/TinyGPSPlus)
- [esp32-MPU-driver](https://github.com/natanaeljr/esp32-MPU-driver)

## Top 10 community-proven implementation patterns

1. One owner task for modem UART.
2. AT command timeout per request.
3. Bounded retry with backoff.
4. State machine for modem lifecycle.
5. Stream-based GNSS parsing.
6. Sleep sequencing with real power measurement.
7. IMU interrupt wake on motion.
8. Watchdog around blocking modem flows.
9. Recovery ladder from soft to hard reset.
10. Persist diagnostics for postmortem.

## Top 10 anti-patterns to avoid

1. Shared modem UART from multiple tasks.
2. Infinite retry loops.
3. Blind string matching on partial AT responses.
4. Manual NMEA parsing per sentence fragment.
5. “Sleep by code only” without measuring current.
6. WDT feeding inside deadlocked loops.
7. Resetting modem before logging root cause.
8. Treating board-specific issue as generic modem bug.
9. Mixing OTA, telemetry, and recovery in one task.
10. Storing raw AT logs with secrets.

## Appendices

### A. Glossary

- **AT sync**: handshake to verify modem responds and is ready.
- **DTR**: data terminal ready pin, often used in sleep control.
- **TWDT**: task watchdog timer.
- **NMEA**: GNSS sentence protocol.
- **Backoff**: increasing wait between retries.

### B. Version Compatibility Matrix

| Component | Recommendation |
|---|---|
| ESP32-S3 firmware | ESP-IDF UART/sleep/WDT APIs |
| SIM7600 control | `esp_modem` or `TinyGSM` wrapper |
| GNSS parse | `TinyGPSPlus` or equivalent stream parser |
| Motion wake | IMU interrupt to wake-capable GPIO |

### C. Raw Research Notes

- Best evidence came from: Espressif docs, SIMCom official files, TinyGSM, piolib-SIM7600, LilyGO issue threads.
- Community issues are strong for failure modes, weak for API guarantees.
- Vendor docs are strong for expected behavior, weak for real-world edge cases.

## Unresolved Questions

- Which firmware stack is target: ESP-IDF native or Arduino/PlatformIO?
- Which exact SIM7600 variant and carrier board are used?
- Is the IMU interrupt wired to an RTC-capable wake pin or only normal GPIO?
- Do we need documented AT examples for GNSS power save mode specifically?
