# Modem

The SIM7600 task is the sole UART and AT owner. Other tasks post link and GNSS requests or copy data through the publish slot and command FIFO. The OTA task calls HTTP synchronously. Its URL and output buffers remain valid until the modem task signals completion.

| Source | Responsibility |
| --- | --- |
| `transport/`, `at/` | UART, PWRKEY, PM lock, AT execution, parsing and raw dispatch |
| `modem_link.c` | LTE registration, retry backoff and MQTT connection steps |
| `mqtt/` | TLS setup, broker session, QoS 1 publication and command receive |
| `modem_http.c`, `modem_gnss.c` | HTTPS byte source and GNSS power or fix parsing |
| `slots.c` | Publish slot, result and command FIFO under one copy mutex |

Public APIs are in `include/modem/modem.h`. Add an LTE step in `modem_link.c` and its enum entry in `modem_internal.h`. MQTT setup and command framing are in `mqtt/mqtt_session.c` and `mqtt/mqtt_rx.c`. Deployment selects TLS in app wiring. PWRKEY sequencing and the restart guard live in `transport/modem_power.c`. The PCB routes RESET, which the current task does not use.
