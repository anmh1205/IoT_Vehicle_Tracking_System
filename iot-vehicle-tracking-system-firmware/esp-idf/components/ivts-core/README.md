# IVTS core

This component builds on the host and ESP32-S3 without SDK dependencies. Firmware tasks call its codecs, parsers and state transitions on data they own.

| Source | Responsibility |
| --- | --- |
| `src/base/` | Shared values, checksums and time conversions |
| `src/event/` | By-value event delivery |
| `src/model/` | Device configuration, versioned offline record codec and console status formatting |
| `src/payload/` | Bounded JSON and MQTT payload contracts |
| `src/fsm/` | Ignition and motion axes and application transitions |
| `src/ota/` | Manifest and version checks and image confirmation policy |

Public headers are under `include/ivts_core`. Change parked or heartbeat sleep policy in `src/fsm/fsm_states.c`. A new state also needs its enum, FSM test and app LED pattern. Add a payload builder to `src/payload` and cover its fields in the MQTT Bridge contract fixture. Record and configuration layout changes require compatibility with devices already deployed.
