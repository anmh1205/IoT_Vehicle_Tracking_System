# App

The app task drains its event queue, refreshes telemetry and executes the FSM. It owns application state after boot. The component's public entry point is `app_start()`. Producers send events through a nonblocking sink supplied at initialization.

| Folder | Responsibility |
| --- | --- |
| `boot`, `runtime` | Initialization order, task configuration, callbacks, event dispatch and FSM actions |
| `device`, `link`, `persist` | Device identity and policy, broker availability, typed NVS records and deep-sleep context |
| `telemetry`, `session`, `alarm` | Measurements, RAW capture, session boundaries and durable motion alarms |
| `publish` | Payload construction, single modem slot, ACK routing and ordered replay |
| `command`, `fw_update` | Command validation and receipts, firmware updates and boot confirmation |
| `power`, `diag` | GNSS requests, LED patterns, sleep entry and runtime diagnostics |

For a new command, add its handler, register it in `command/cmd_table.c` and cover it in the command fixture. Editable configuration fields are listed in `command/cmd_config.c` and applied to the FSM by `boot/app_config.c`. A new event uses the dispatch table in `runtime/app_dispatch.c` and a handler in its owner.

For a new payload, add its builder to ivts-core and its send function to `publish/messages.c`. Register the ACK callback in `boot/app_wiring.c`. Control priority and boundary gating live in `publish/outbox.c` and `publish/outbox_calc.c`. Sleep entry and radio shutdown live in `power/sleep_controller.c`.
