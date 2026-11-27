# IVTS core

This component runs on the host and ESP32-S3 without SDK dependencies. Firmware tasks call its codecs, parsers and state transitions on data they own.

| Folder | Responsibility |
| --- | --- |
| `base`, `model`, `event` | Shared types, checksums, time conversions, records and by-value events |
| `fsm` | Ignition/motion axes and the application state transition policy |
| `payload` | Bounded JSON tokenizer, typed field reads and MQTT payload contracts |
| `ota` | Manifest and version contract, progress names and confirmation policy |

Public headers are under `include/ivts_core`. Change parked or heartbeat sleep policy in `src/fsm/fsm_states.c`. A new state also needs its enum, FSM tests and the app LED pattern. Add a payload builder in `src/payload` and cover its fields in the cloud-contract fixture. Record layout and config changes require compatibility with devices already deployed.
