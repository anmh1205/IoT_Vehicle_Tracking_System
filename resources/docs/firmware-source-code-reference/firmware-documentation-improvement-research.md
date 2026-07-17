# Firmware Documentation Improvement Research

**Date:** 2026-05-05  
**Scope:** ideas to improve firmware source-reading docs for `iot-vehicle-tracking-system-firmware/`  
**Method:** primary/near-primary sources: Espressif docs, Doxygen manual, Mermaid docs, C4 model docs, SIMCom MQTT AT command manual mirror.

## Executive Summary
The current walkthrough should keep the flow-first style, but add generated evidence around it: call graphs, log checkpoints, persistence maps, OTA state tables, sleep/wake decision maps, and crash-debug runbooks. The strongest improvement is to stop treating diagrams as decoration. Each diagram should answer one reading question and link back to exact files/functions/log keywords.

The documentation should be split into small learning modules: Boot/FSM, Publish, Command, OTA, Offline Queue, MQTT AT, Sleep/Wake, Persistence, Debug. Each module should have: goal, source map, sequence/state diagram, annotated code excerpts, runtime logs, and board validation steps.

## Key Research Findings

### 1. Startup Docs Should Mirror ESP-IDF Boot Reality
ESP-IDF documents the path before `app_main()`: ROM bootloader, second-stage bootloader, application startup, `main_task`, then `app_main()`.

Apply to this firmware:
- Add a "before `app_main()`" note so beginners do not think `main.c` is the first CPU instruction.
- Add a boot timeline: ROM -> bootloader -> partition/app load -> `app_main()` -> `app_core_bootstrap_run()`.
- Add a checkpoint table for reset reason, wakeup cause, selected app partition, and initial FSM state.

Source: [ESP-IDF Application Startup Flow](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-guides/startup.html)

### 2. OTA Docs Need A Two-Phase State Table
ESP-IDF OTA rollback requires the new app to confirm itself. If rollback support is enabled and a reboot happens without confirmation, the bootloader can roll back to the previous app.

Apply to this firmware:
- Add a table mapping project states to ESP-IDF states:
  - `assigned`
  - `downloading`
  - `installing`
  - `pending_confirm`
  - `confirming`
  - `success`
  - `failed`
- Add a diagram that separates "before restart" and "after restart".
- Add failure checkpoints: unsafe runtime window, battery too low, download failed, hash failed, confirm timeout, rollback.

Source: [ESP-IDF OTA Updates and App Rollback](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/system/ota.html)

### 3. Sleep/Wake Docs Need A Decision Matrix, Not A Paragraph
ESP-IDF sleep docs emphasize configured wake sources, wake cause checks, and wireless/Bluetooth behavior around sleep.

Apply to this firmware:
- Add a sleep entry matrix:
  - sleep enabled?
  - OTA in progress?
  - ignition active?
  - command pending?
  - modem/BLE shutdown done?
  - wake source configured?
- Add a wake cause matrix:
  - timer -> heartbeat
  - external/IMU -> alarm or heartbeat
  - sleep blocked -> check ignition
- Add a "BLE/OBD after sleep" note because wireless connections do not persist through sleep.

Source: [ESP-IDF Sleep Modes](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/system/sleep_modes.html)

### 4. Persistence Docs Need A Storage Ownership Map
ESP-IDF NVS is key-value storage in flash and official examples emphasize diagnostics, read/write success checks, and usage statistics.

Apply to this firmware:
- Add a persistence ownership map:
  - NVS config
  - NVS OTA context
  - RTC context
  - SD offline queue
  - volatile runtime context
- Add "who writes / who reads / when cleared" for each persisted item.
- Add a failure checklist: NVS init fail, config invalid, OTA context invalid, SD mount fail, replay metadata corrupt.

Source: [ESP-IDF NVS Library](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/storage/nvs_flash.html)

### 5. Logs Should Become A Navigable Index
ESP-IDF logging supports configurable log levels, tags, and formatting. For onboarding, logs should be treated as anchors back into source.

Apply to this firmware:
- Add a "log keyword -> file/function -> meaning" table.
- Standardize tags by subsystem:
  - bootstrap
  - FSM transition
  - prelude network
  - command
  - OTA
  - publish pipeline
  - offline replay
  - MQTT AT
- Add example serial snippets under each flow.

Source: [ESP-IDF Logging Library](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/system/log.html)

### 6. Crash Debug Docs Should Be A Separate Runbook
ESP-IDF fatal error docs explain panic handler behavior, register/backtrace output, GDB stub, and common Guru Meditation causes. Core dump docs explain post-mortem snapshots of tasks/stacks/registers.

Apply to this firmware:
- Add a "panic/backtrace reading" page:
  - what to copy from serial log
  - how to identify exception type
  - how to map PC/backtrace to source
  - what globals/context to inspect after restart
- Add a "core dump optional" page for deeper debug.
- Add "function pointer crash" warning for runtime ports because invalid function pointer can look like `InstrFetchProhibited`.

Sources:
- [ESP-IDF Fatal Errors](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/fatal-errors.html)
- [ESP-IDF Core Dump](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/core_dump.html)
- [ESP-IDF JTAG Debugging](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/jtag-debugging/index.html)

### 7. App Trace Can Upgrade "I Think" Into Runtime Evidence
ESP-IDF application tracing can transfer runtime data over JTAG/UART/USB with low overhead and supports behavior analysis, lightweight logging, and coverage.

Apply to this firmware:
- Add an optional tracing backlog item:
  - trace FSM transitions
  - trace publish attempts and queue fallback
  - trace OTA status changes
  - trace BLE connect result
- Keep this optional; serial logs are enough for first-pass docs.

Source: [ESP-IDF Application Level Tracing](https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-guides/app_trace.html)

### 8. Doxygen/Graphviz Can Generate Raw Call Evidence
Doxygen can use Graphviz `dot` to generate include graphs, call graphs, caller graphs, and directory dependency graphs.

Apply to this firmware:
- Generate Doxygen HTML for firmware components.
- Enable `HAVE_DOT`, `CALL_GRAPH`, `CALLER_GRAPH`, and `DIRECTORY_GRAPH`.
- Export only useful graphs into docs:
  - `app_core_bootstrap_run`
  - `state_machine_run`
  - `state_machine_run_wake_prelude`
  - `state_publish_via_pipeline`
  - `command_handler_process`
  - `state_machine_process_ota_command`
  - `offline_queue_replay_tick`
  - `tracker_mqtt_publish_with_msg_id_internal`
- Add a warning that generated graphs are evidence, not explanation. Keep human-written flow notes beside them.

Source: [Doxygen Graphs and Diagrams](https://www.doxygen.nl/manual/diagrams.html)

### 9. Mermaid Should Be Used By Diagram Type, Not Randomly
Mermaid sequence diagrams are good for "who calls whom in order". State diagrams are good for FSM behavior. Flowcharts are good for decisions and fallback.

Apply to this firmware:
- Sequence diagram: boot, publish pipeline, command, OTA.
- State diagram: FSM and OTA confirm lifecycle.
- Flowchart: sleep decision, offline replay decision, MQTT AT publish stages.
- Avoid giant diagrams. One diagram answers one question.

Sources:
- [Mermaid Sequence Diagrams](https://mermaid.js.org/syntax/sequenceDiagram.html)
- [Mermaid State Diagrams](https://mermaid.js.org/syntax/stateDiagram)

### 10. Use C4 Only For Static Structure
C4 recommends context/container/component/code levels, but also says not every level is needed.

Apply to this firmware:
- Use C4-style component map for static source organization.
- Do not force C4 for runtime flows; use sequence/state diagrams instead.
- Add one "Component diagram" only:
  - app-core
  - shared-kernel
  - domain components
  - platform components
  - adapters

Source: [C4 Model Diagrams](https://c4model.com/diagrams)

### 11. MQTT AT Docs Should Become A Stage Diagram
SIMCom MQTT AT manual documents the `AT+CMQTTTOPIC`, `AT+CMQTTPAYLOAD`, and `AT+CMQTTPUB` stages, including topic and payload length ranges.

Apply to this firmware:
- Add a stage diagram:
  - build topic
  - send topic length/data
  - send payload length/data
  - publish with QoS
  - wait for `+CMQTTPUB`
  - parse URC
- Add a "length mismatch" debug checklist.
- Add a "topic/payload cleaned after publish" note if matching the manual version used for this modem firmware.

Source: [SIM7500/SIM7600 MQTT AT Command Manual mirror](https://simcom.ee/documents/SIM7500E/SIM7500_SIM7600%20Series_MQTT_ATC_V1.01.pdf)

## Recommended Next Edits
1. Add a `07-debugging-with-logs-and-crashes.md` page.
2. Add a `08-persistence-and-runtime-state-map.md` page.
3. Add a `09-generated-call-graphs.md` page with Doxygen/Graphviz instructions.
4. Split `00-beginner-start-here.md` into flow pages once it becomes too long.
5. Add real serial log snippets under each flow once board logs are available.

## Unresolved Questions
1. ESP-IDF version used by firmware build should be pinned in docs, because links differ between latest/stable.
2. Need confirm actual SIM7600 firmware/manual version before documenting exact MQTT AT edge cases.
3. Need board serial logs to validate the proposed log keyword index.
