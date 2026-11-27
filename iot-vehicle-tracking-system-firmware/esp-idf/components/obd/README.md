# OBD

The OBD task starts BLE, runs discovery and polls ELM327. NimBLE host callbacks copy tagged events to the OBD queue without blocking. The app reads the diagnostic snapshot under its copy mutex and receives samples and link state by event.

| Folder | Responsibility |
| --- | --- |
| `ble` | NimBLE lifecycle, GAP, GATT and callback events |
| `session` | Adapter scan, connection, discovery and ELM setup |
| `poll` | Live PIDs, readiness and diagnostic snapshots |
| `elm` | ELM reply parsing, init commands and PID decoding |

Public APIs are in `include/obd/obd.h`. Add a PID decoder in `elm/obd_pid.c`, update the poll list in `poll/obd_poll.c` and update the sample model in ivts-core. Add initialization commands in the `ELM_INIT_SEQ` table in `elm/elm327.c`.
