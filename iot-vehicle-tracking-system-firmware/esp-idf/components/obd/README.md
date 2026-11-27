# OBD

The OBD task starts BLE, runs discovery and polls ELM327. NimBLE callbacks queue tagged events without blocking. The app reads the diagnostic snapshot under a copy mutex and receives samples and link state through events.

| Source | Responsibility |
| --- | --- |
| `obd_task.c` | Public startup and OBD task lifecycle |
| `obd_ble.c` | NimBLE host, GAP and GATT callbacks |
| `obd_session.c` | Scan, connect, discover GATT characteristics and configure ELM327 |
| `obd_poll.c` | Live PIDs, readiness and trouble-code snapshots |
| `obd_elm327.c`, `obd_pid.c` | ELM reply framing and OBD-II decoding |

Public APIs are in `include/obd/obd.h`. Add a PID decoder to `obd_pid.c`, add it to the poll list in `obd_poll.c` and update the sample model in ivts-core. Add ELM initialization commands in the `ELM_INIT_SEQ` table in `obd_elm327.c`.
