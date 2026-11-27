# Modem

The SIM7600 task is the only caller of UART and AT operations. Other tasks post link and GNSS requests or copy data through the publish slot and command FIFO. The OTA task waits on a semaphore for HTTP RPC results.

| Folder | Responsibility |
| --- | --- |
| `transport`, `at` | UART, PWRKEY, PM lock, AT parsing, command execution and raw byte routing |
| `link` | LTE registration, retry/backoff and MQTT connection steps |
| `mqtt` | TLS setup, session, QoS 1 publication and received command frames |
| `http`, `gnss` | HTTPS byte source and GNSS power and fix parsing |
| `slots` | Publish result and command FIFO with a shared copy mutex |

Public APIs are in `include/modem/modem.h`. Add an LTE step in `link/link_steps.c` and `link/modem_link.h`. MQTT setup and command framing are in `mqtt/mqtt_session.c` and `mqtt/mqtt_rx.c`. Deployment-specific TLS selection belongs in app wiring. PWRKEY behavior and its restart delay live in `transport/modem_power.c`. The PCB routes RESET, which the current task does not use.
