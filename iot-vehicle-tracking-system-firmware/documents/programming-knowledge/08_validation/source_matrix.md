# Source Matrix

## Purpose
This matrix audits the programming-knowledge set for source quality, citation consistency, and validation coverage. It covers the existing docs in `01_project_analysis`, `02_hardware_mapping`, `03_esp32s3_esp_idf`, `04_modem_gnss`, `05_imu`, plus the new RTC set in `07_rtc`.

## Evidence classes
- **Vendor**: official silicon / module / framework documentation
- **Project**: verified from firmware source or checked-in project artifacts
- **Netlist**: derived from board connectivity documents
- **Inference**: reasonable conclusion from source + netlist, but not directly proven
- **Validation needed**: bench or datasheet confirmation still required

## Document-to-source matrix

| Document | Main claim family | Strongest evidence class | Primary sources used | Weak spots | Status |
|---|---|---|---|---|---|
| `01_project_analysis/firmware_component_map.md` | Module boundaries and runtime coupling | Project | `main/CMakeLists.txt`, `main/main.c`, `main/src/state_machine.c` | Some domain boundaries are inferred from naming and call graph | Good |
| `01_project_analysis/inventory_project_structure.md` | Build/runtime structure and file inventory | Project | `main/CMakeLists.txt`, `main/main.c`, `main/inc/*` | Hardware claims are intentionally out of scope | Good |
| `02_hardware_mapping/hardware_pin_mapping.md` | GPIO and subsystem mapping | Project + Netlist | `main/inc/pin_map.h`, `main/src/power_mgr.c`, netlist summary | Modem-side GPIOs still need bench confirmation | Good |
| `02_hardware_mapping/netlist_parsed_summary.md` | Netlist-to-firmware crosswalk | Netlist + Project | board netlist, `pin_map.h`, `main/src/*` | Exact MCU pad for some modem nets not fully exposed | Good |
| `02_hardware_mapping/hardware_firmware_crosscheck.md` | Match/mismatch list | Netlist + Project | same as above | Some modem claims remain incomplete by design | Good |
| `02_hardware_mapping/unresolved_hardware_questions.md` | Validation backlog | Validation needed | netlist + `pin_map.h` | No issue; document is explicitly open-ended | Good |
| `03_esp32s3_esp_idf/esp32s3_esp_idf_programming_guide.md` | Boot, sleep, OTA, I2C, UART | Project + Vendor | `main/main.c`, `state_machine.c`, `nvs_config.c`, `imu_lis3dsh.c`, ESP-IDF docs | Some feature absences are negative claims and should be retested after changes | Good |
| `03_esp32s3_esp_idf/esp_idf_project_architecture.md` | Runtime architecture and persistence | Project + Vendor | `main/CMakeLists.txt`, `main/src/state_machine.c`, `partitions.csv` | A few architecture statements are still inference-heavy | Good |
| `03_esp32s3_esp_idf/esp_idf_best_practices.md` | Best-practice guidance | Vendor | ESP-IDF docs, project conventions | Should be rechecked after ESP-IDF version bumps | Good |
| `03_esp32s3_esp_idf/esp_idf_common_pitfalls.md` | Pitfalls and warnings | Vendor + Project | ESP-IDF docs, source review | Some guidance is generic and not board-specific | Good |
| `04_modem_gnss/sim7600_overview.md` | SIM7600 role and behavior | Vendor + Project | modem source, SIMCom references | Exact AT semantics need vendor cross-check | Good |
| `04_modem_gnss/sim7600_at_command_architecture.md` | AT transport layering | Project + Vendor | `modem_at.c`, `modem_lte.c`, `modem_gnss.c` | Parser edge cases still need runtime capture | Good |
| `04_modem_gnss/sim7600_driver_design_for_esp_idf.md` | Driver boundaries and recovery policy | Project + Inference | modem source, power manager, FSM | Several claims are design recommendations, not current runtime facts | Good |
| `04_modem_gnss/sim7600_gnss_guide.md` | GNSS usage and sample handling | Project + Vendor | `modem_gnss.c` | `+CGNSINF` parsing should be verified on real modem firmware | Good |
| `04_modem_gnss/sim7600_power_and_boot_sequence.md` | Power sequencing and boot behavior | Project + Vendor | `power_mgr.c`, `modem_lte.c`, `state_machine.c` | Pulse width / polarity should still be measured | Good |
| `04_modem_gnss/sim7600_debugging_and_failures.md` | Failure modes and recovery | Project + Validation needed | modem source, runtime logs | Needs more bench data for exact failure taxonomy | Good |
| `05_imu/imu_driver_design_notes.md` | IMU boundaries and wake behavior | Project + Vendor + Validation needed | `imu_lis3dsh.c`, `state_machine.c`, `pin_map.h` | Threshold tuning and wake reliability need field tests | Good |
| `05_imu/lis3dsh_programming_guide.md` | Active LIS3DSH runtime facts | Project + Vendor | `imu_lis3dsh.c`, `pin_map.h`, `state_machine.c`, ST datasheet | Interrupt polarity and sensor tuning still need validation | Good |
| `05_imu/lis3dsh_register_walkthrough.md` | Used registers and driver flow | Project + Vendor | `imu_lis3dsh.c`, `pin_map.h` | Copy-risk from LIS3DH remains a concern | Good |
| `05_imu/lis3dsh_vs_lis3dh_comparison.md` | Historical comparison and migration warnings | Vendor + Project | `lis3dsh_*` docs, IMU source | Must stay synchronized with active runtime docs | Good |
| `05_imu/imu_validation_checklist.md` | Field test checklist | Validation needed | IMU docs, state machine, pin map | Test results not yet embedded in docs | Good |
| `07_rtc/ds3231m_programming_guide.md` | Planned DS3231M runtime model | Project + Validation needed | netlist summary, hardware mapping, `state_machine.c` | No DS3231M driver exists yet | Draft |
| `07_rtc/ds3231m_register_reference.md` | Planned RTC register map | Vendor + Validation needed | DS3231M datasheet (to verify), project context | Register details must be confirmed before coding | Draft |
| `07_rtc/rtc_driver_design_notes.md` | Future driver boundaries | Inference + Validation needed | netlist summary, `state_machine.c`, `app_state.h` | Entire driver is design-stage only | Draft |

## Observations
- The documentation set already separates **project evidence** from **validation needed** fairly well.
- The biggest citation risk is where docs mix **negative claims** (`not present`, `not used`) with stale source snapshots.
- The biggest hardware risk is modem-side control mapping and the newly introduced RTC wake/alarm path.
- The biggest documentation risk is inconsistent citation labeling between families.

## Recommendations
1. Keep the evidence class label in every major section.
2. Re-validate any doc that says a feature is absent after future source changes.
3. Promote DS3231M claims only after the datasheet and board routing are checked.
4. Keep the validation backlog explicit instead of burying it in narrative text.

## Sources
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/01_project_analysis/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/02_hardware_mapping/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/03_esp32s3_esp_idf/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/04_modem_gnss/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/05_imu/*.md`
- `iot-vehicle-tracking-system-firmware/documents/programming-knowledge/07_rtc/*.md`