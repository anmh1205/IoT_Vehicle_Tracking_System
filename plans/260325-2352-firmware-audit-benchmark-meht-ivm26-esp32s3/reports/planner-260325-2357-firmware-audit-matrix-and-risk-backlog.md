# Firmware benchmark matrix + risk-prioritized audit backlog

## Scope
- Planning-only artifact (no implementation).
- Priority: ESP32 runtime, telemetry reliability, SD-card storage integrity.

## Explicit comparison matrix (local vs MEHT-IVM26-ESP32S3)

| Domain | Criterion | Local baseline (evidence) | Benchmark (evidence) | Gap type | Priority |
|---|---|---|---|---|---|
| Architecture | State orchestration | BLE manager lifecycle rõ nhưng không thấy FSM toàn cục (`ble_mgr.c`, `ble_obd.c`) | Có FSM rõ BOOT/IDLE/MONITORING/OFFLINE/FLUSH (`main/state_machine/readme.md`) | partial | P1 |
| Architecture | Module separation | Có tách `ble_init`/`ble_mgr`/`ble_obd` | Có tách modem/portal/OTA/storage/FSM | partial | P2 |
| Telemetry | Schema/versioning | Chưa thấy contract schema version rõ trong baseline local | Chưa thấy schema/versioning rõ từ snippet benchmark | unknown | P0 |
| Telemetry | QoS policy clarity | README hệ thống có QoS 0/1 policy, chưa map rõ tại firmware baseline | Không thấy tương đương OBD telemetry contract | partial | P1 |
| Telemetry | Retry/backoff budget | Timeout có, backoff budget chưa rõ | Reconnect pattern có, budget/limit chưa rõ | unknown | P0 |
| Telemetry | Buffering + flush semantics | Chưa thấy offline queue/flush path local trong tập evidence | Có offline + flush state ở FSM | missing (local evidence) | P0 |
| BLE/OBD | Service discovery reliability | Có discovery + notify + queue serialization, có FIXME và fragility markers | Không có OBD2 flow tương đương | partial | P1 |
| BLE/OBD | Parser robustness | Parsing ASCII OBD có brittle dấu hiệu | N/A domain mismatch | partial | P1 |
| Storage SD | Offline persistence presence | Không thấy SD subsystem trong baseline local đọc được | Có SD offline storage mục tiêu sản phẩm | missing (local evidence) | P0 |
| Storage SD | Integrity/checksum before replay | Chưa thấy | Chưa thấy rõ | unknown | P0 |
| Storage SD | Corruption recovery policy | Chưa thấy | Chưa thấy rõ | unknown | P0 |
| Security | OTA authenticity chain | Có OTA topic contract ở README hệ thống; firmware verify path chưa rõ | Có HTTPS OTA; signature/authenticity beyond TLS chưa rõ | unknown | P0 |
| Security | Config/control surface protection | Command topic có, authz per-device chưa thấy evidence firmware | Captive portal có; access hardening chưa rõ | partial | P1 |
| Security | Topic/device authorization assumptions | README có ACL khuyến nghị, chưa có bằng chứng enforce firmware side | Không phải trọng tâm repo benchmark | unknown | P1 |
| Reliability | Reset/watchdog recovery | Local reset handling được nêu là chưa implement đầy đủ trong baseline | Có reconnect + FSM shutdown path | partial | P1 |
| Observability | Diagnostic signals for audit | Có logs/debug prints, nhưng không thấy chuẩn evidence contract | Có conditional logging/state separation | partial | P2 |

### Matrix notes
- Benchmark repo khác domain (industrial vibration), chỉ dùng để học resilience pattern, không dùng làm chuẩn chức năng OBD2.
- `missing` ở đây là missing evidence trong local baseline đã khảo sát, không khẳng định hệ thống thật không có.

## Risk-prioritized audit backlog (planning wave)

| ID | Item | Risk | Owner role | Dependency | Expected artifact |
|---|---|---:|---|---|---|
| AUD-CRIT-01 | Xác minh telemetry schema/version contract end-to-end | 15 | Firmware lead | none | Schema map + version policy note |
| AUD-CRIT-02 | Audit retry/backoff budget cho uplink telemetry | 15 | Firmware lead | AUD-CRIT-01 | Retry policy matrix + fail traces |
| AUD-CRIT-03 | Audit SD offline buffer + flush trigger semantics | 15 | Embedded QA | none | State transition evidence + replay rules |
| AUD-CRIT-04 | Audit SD integrity (checksum/signature/hash) trước flush | 15 | Security reviewer | AUD-CRIT-03 | Integrity control result |
| AUD-CRIT-05 | Audit SD corruption recovery path (power-cut scenario) | 15 | Embedded QA | AUD-CRIT-03 | Fault-injection report |
| AUD-CRIT-06 | Audit OTA authenticity chain (TLS vs signed image) | 15 | Security reviewer | none | OTA trust-chain checklist |
| AUD-HIGH-01 | Audit BLE discovery completion/reconnect fragility points | 10 | Firmware lead | none | BLE lifecycle findings |
| AUD-HIGH-02 | Audit OBD parser robustness với malformed payload | 10 | Embedded QA | AUD-HIGH-01 | Parser robustness evidence |
| AUD-HIGH-03 | Audit command/control authorization per device scope | 10 | Security reviewer | AUD-CRIT-01 | Authz trace + control gap |
| AUD-HIGH-04 | Audit reset/watchdog behavior and safe recovery | 10 | Firmware lead | AUD-HIGH-01 | Recovery timing report |
| AUD-HIGH-05 | Audit telemetry loss visibility + observability hooks | 10 | Embedded QA | AUD-CRIT-02 | Drop-detection dashboard spec |
| AUD-MED-01 | Chuẩn hóa evidence template cho toàn audit cycle | 6 | QA coordinator | none | Evidence template v1 |
| AUD-MED-02 | Chuẩn hóa severity mapping + remediation class | 6 | Security reviewer | AUD-MED-01 | Severity rubric |

### Wave plan
- Wave-0 (Discovery, 3-4 ngày): AUD-CRIT-01/03/06 + AUD-HIGH-01.
- Wave-1 (Deep audit, 5-7 ngày): phần còn lại của AUD-CRIT và AUD-HIGH.
- Wave-2 (Closure, 2-3 ngày): AUD-MED + residual risk sign-off.

## Critical risks (top)
1. Không có bằng chứng rõ SD-card subsystem local production path -> rủi ro audit lệch trọng tâm.
2. Telemetry schema/version và retry budget chưa minh bạch -> khó định nghĩa pass/fail.
3. OTA authenticity chưa rõ beyond TLS -> rủi ro supply-chain/firmware trust.
4. BLE discovery/parser fragility có dấu hiệu trong baseline -> rủi ro mất dữ liệu chẩn đoán.

## Unresolved questions
- Firmware production local (ngoài thư mục example) nằm ở đường dẫn nào để audit thực chiến?
- SD-card đang là implementation hoàn chỉnh hay roadmap item?
- OTA hiện có ký số image/public key pinning chưa?
- Có telemetry schema registry chính thức không?