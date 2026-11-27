# App

The app task drains by-value events, refreshes telemetry and runs the FSM. Boot creates the event queue before starting producers. The entry point is `app_start()`.

| Source | Responsibility |
| --- | --- |
| `src/app.c`, `src/app_internal.h` | App entry point and shared declarations |
| `src/boot/` | Startup order, policy mapping, adapter wiring and the shared six-task specification |
| `src/runtime/` | Task creation, queue ownership, dispatch, diagnostics and FSM effects |
| `src/session/` | Sensor snapshots and RAW capture, session boundaries and durable alarms |
| `src/fw/` | Firmware update orchestration and confirmation |
| `src/power/` | Radio shutdown, sleep decisions and status LED patterns |
| `src/command/` | Cloud command dispatch, durable receipts and completion |
| `src/publish/` | Payload construction, one in-flight publish, ACK routing and ordered replay |
| `src/persist/` | Typed NVS records, deep-sleep context and sequence allocation |
| `src/device/` | Device identity and policy, broker availability, GNSS demand and clock access |

For a new command, add a handler, register it in the table in `command/cmd_inbox.c` and exercise it in the command fixture. Add editable configuration fields in `command/cmd_config.c` and apply policy in `boot/app_config.c`. Route a new component event through `runtime/app_dispatch.c` to its owner.

For a new payload, add its builder to ivts-core, add its send function in `publish/messages.c` and register its ACK callback in `boot/app_wiring.c`. Control priority and the gate that keeps a boundary behind older RAW records both live in `publish/outbox.c`.
