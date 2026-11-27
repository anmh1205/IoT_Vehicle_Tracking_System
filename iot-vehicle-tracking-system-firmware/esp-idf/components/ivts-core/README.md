# IVTS core

This component builds on the host and ESP32-S3 without SDK dependencies. Firmware tasks call its codecs, parsers and state transitions on data they own.

| Source | Responsibility |
| --- | --- |
| `base/`, `event.c` | Shared values, checksums, time conversions and by-value event delivery |
| `model_config.c`, `model_record.c` | Device configuration and versioned offline record codec |
| `fsm/` | Ignition and motion axes and application transitions |
| `payload/` | Bounded JSON and MQTT payload contracts |
| `ota_contract.c` | Manifest and version checks and image confirmation policy |

Public headers are under `include/ivts_core`. Change parked or heartbeat sleep policy in `src/fsm/fsm_states.c`. A new state also needs its enum, FSM test and app LED pattern. Add a payload builder to `src/payload` and cover its fields in the MQTT Bridge contract fixture. Record and configuration layout changes require compatibility with devices already deployed.
