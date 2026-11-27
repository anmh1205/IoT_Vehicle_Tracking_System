# App

The app task drains by-value events, refreshes telemetry and runs the FSM. Boot creates the event queue before starting producers. The entry point is `app_start()`.

| Source | Responsibility |
| --- | --- |
| `boot/` | Startup order, policy mapping, adapter wiring and the shared six-task specification |
| `runtime/` | Task creation, queue ownership, dispatch, diagnostics and FSM effects |
| `device/` | Device identity and policy, broker availability and GNSS demand |
| `persist/` | Typed NVS records, deep-sleep context and sequence allocation |
| `publish/` | Payload construction, one in-flight publish, ACK routing and ordered replay |
| `command/` | Cloud command dispatch, durable receipts and completion |
| `telemetry.c`, `session_tracker.c`, `motion_alarm.c` | Sensor snapshots and RAW capture, session boundaries and durable alarms |
| `fw_update.c`, `sleep_controller.c`, `led_pattern.c` | Firmware confirmation, radio shutdown and sleep, LED policy |

For a new command, add a handler, register it in the table in `command/cmd_inbox.c` and exercise it in the command fixture. Add editable configuration fields in `command/cmd_config.c` and apply policy in `boot/app_config.c`. Route a new component event through `runtime/app_dispatch.c` to its owner.

For a new payload, add its builder to ivts-core, add its send function in `publish/messages.c` and register its ACK callback in `boot/app_wiring.c`. Control priority and the gate that keeps a boundary behind older RAW records both live in `publish/outbox.c`.
