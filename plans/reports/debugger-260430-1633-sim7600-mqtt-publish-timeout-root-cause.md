# Executive summary

Symptom pattern fits prompt/data-entry handling failure first, not full MQTT/LTE disconnect.

Evidence says publish path times out during the raw `AT+CMQTTPAYLOAD` data phase while `s_connected` stays true, then later offline replay succeeds on same modem session. That strongly points to transient AT bus ownership / response completion bug around prompt-mode writes, with weak local recovery after a failed payload phase.

Most likely root cause order:
1. `modem_at_send()` treats any trailing `>` as response-complete, even for normal data writes.
2. `tracker_mqtt_input_data()` sends payload bytes through `tracker_mqtt_send_cmd()`, which still expects AT-style completion markers instead of pure `+CMQTTPAYLOAD:` result.
3. Concurrent URC polling/users of same UART lock can delay prompt/data window enough to hit `MQTT_INPUT_TIMEOUT_MS=8000`.
4. On failure, publish path returns without explicit session resync/flush, so next live publish may also fail until later replay gets a clean window.

This looks primarily like prompt handling + AT bus contention. Less like true modem disconnect. Recovery sequencing is also too weak.

# Key evidence

- Publish path uses 2-step prompt entry:
  - `AT+CMQTTTOPIC=...` then raw topic bytes
  - `AT+CMQTTPAYLOAD=...` then raw payload bytes
  - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_publish.c:33-42`
- Data phase helper:
  - prepare command via `modem_at_send(...)`
  - then raw data via `tracker_mqtt_send_cmd(data, MQTT_INPUT_TIMEOUT_MS, ...)`
  - logs `AT input data interrupted err=%s connected=%d`
  - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c:329-381`
- `modem_at_send()` completes when response probe ends with `OK`, `ERROR`, or just `>`.
  - File: `.../adapter-modem-sim7600-at/src/modem_at.c:197-200, 334-403`
- MQTT/LTE state flags can remain true because disconnect marking only happens on parsed MQTT error URCs/codes like `+CMQTTCONNLOST`, `+CMQTTNONET`, `err 9/11/13/26`.
  - Timeout alone does not mark disconnected.
  - Files: `.../mqtt_urc_parser.c:18-32, 220-229, 677-685`
- Offline replay later succeeds because replay only requires `tracker_mqtt_is_connected()==true` and a later clean publish window.
  - File: `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-storage/src/offline_queue.c:307-345, 465-539`

# Why this does not look like a real disconnect

- User symptom: `LTE=1` and `mqtt=1` remain true.
- Code path: timeout in `tracker_mqtt_input_data()` does not call `tracker_mqtt_mark_disconnected()` unless modem returned a parsed MQTT error code during prepare phase.
- Replay succeeding seconds later on same queue/session means modem service/client/session were still usable. If broker socket were truly dead, later publish would likely trigger `+CMQTTCONNLOST`/disconnect code path or repeated `CMQTTPUB` rejects.

# Likely failure mechanism

## 1) Wrong abstraction for prompt-mode raw data write

`tracker_mqtt_input_data()` uses `tracker_mqtt_send_cmd()` for the raw payload bytes.

But raw payload write is not a normal AT command. After prompt `>`, modem expects exactly N bytes of data, then returns final result `+CMQTTPAYLOAD: ...`/`OK` later. Reusing generic `modem_at_send()` means the raw-data phase shares the same heuristics and lock behavior as AT commands.

Precise fix point:
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c:371-381`
- Replace generic `tracker_mqtt_send_cmd(data, ...)` path with a dedicated “send exact data bytes after prompt, then wait for result prefix” helper.

## 2) Response completion heuristic is too broad

`modem_at_response_done()` treats any trailing `>` as complete response. Good for prepare phase, dangerous as a generic rule for all modem sends.

If any interleaved modem output or prompt fragment appears while a different AT op is active, generic send may terminate early or misclassify state. That makes prompt-mode flows brittle.

Precise fix point:
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-modem-sim7600-at/src/modem_at.c:197-200`
- Limit `>` completion to explicit prompt-expected operations only, not all `modem_at_send()` traffic.

## 3) AT bus contention can shrink the payload-input window

`modem_at_send()` holds `s_at_lock` for full operation. `modem_at_poll_urc()` tries non-blocking lock acquisition and returns `ESP_ERR_TIMEOUT` if busy, so polling itself does not corrupt an active send. Good.

But other tasks that call `modem_at_send()` can still queue behind the mutex and compete for UART time between publish attempts. Also `modem_at_send()` drains pending input before sending a command. During fast periodic state publishing + LTE FSM + command RX handling, prompt window can become fragile, especially with only `MQTT_INPUT_TIMEOUT_MS=8000`.

This makes contention a contributor, not primary root cause.

Precise fix points:
- Audit all concurrent senders around publish cadence and replay cadence.
- Especially callers under:
  - `.../components/app-core/src/state_publish_pipeline.c`
  - `.../components/adapter-modem-sim7600-at/src/modem_lte_fsm.c`
  - any URC-driven command handling that may trigger modem ops while publishes are frequent.

## 4) Recovery after failed payload phase is incomplete

When payload input fails, code just logs and returns `-1`.

No targeted cleanup occurs:
- no parser reset
- no best-effort drain of stale result
- no publish-state reset beyond later caller path
- no forced revalidation of session before next live publish

That explains clustered failures followed by later replay success when timing naturally clears.

Precise fix points:
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_publish.c:39-42`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c:373-379`
- After data-phase timeout, do a bounded resync: drain residual modem output, reset publish wait state, optionally query `AT+CMQTTDISC?`, and if session still connected keep service/client; else mark disconnected.

# Precise fix recommendations

## Priority 1: split prompt-mode transport from generic AT command transport

Add dedicated helper behavior for `CMQTTTOPIC` / `CMQTTPAYLOAD` / `CMQTTSUB` prompt flows:
- send prepare command
- wait specifically for prompt `>`
- write exact `len` bytes only
- then wait specifically for `{result_prefix}` and/or `OK`
- do not use generic `modem_at_response_done()` for raw data bytes

Fix locations:
- `.../adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c` (`tracker_mqtt_input_data`) 
- possibly `.../adapter-modem-sim7600-at/src/modem_at.c` add lower-level exact-write helper

## Priority 2: make prompt detection opt-in, not global

Refactor `modem_at_send()` or create variant flags:
- default completion: `OK` / `ERROR` only
- explicit prompt mode for prepare commands only

Fix location:
- `.../adapter-modem-sim7600-at/src/modem_at.c:197-200, 334-403`

## Priority 3: harden failure resync after `CMQTTPAYLOAD` timeout

On `AT input data interrupted` / `CMQTTPAYLOAD failed`:
- consume residual UART bytes for short bounded window
- reset parser state if partial RX/result markers exist
- query `AT+CMQTTDISC?`
- if `disc_state==0`, preserve connected session but clear local publish wait state
- if query fails or disconnected, mark MQTT disconnected so caller reconnects instead of repeatedly pretending online

Fix locations:
- `.../adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c`
- `.../adapter-mqtt-sim7600-at/src/mqtt_publish.c`
- reuse helpers in `.../adapter-mqtt-sim7600-at/src/mqtt_session.c`

## Priority 4: reduce contention around live publish/replay overlap

Guard against immediate replay trying soon after a failed live publish burst. Current replay waits for later tick, which helped here, but explicit backoff would reduce churn.

Fix locations:
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-storage/src/offline_queue.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/app-core/src/state_publish_pipeline.c`

Suggested behavior:
- after prompt/data timeout, set short publish-cooldown before next live publish
- let offline queue replay own recovery send path after cooldown or after explicit session probe

# Bottom line

Most likely root cause: generic AT send/response logic is being reused for SIM7600 prompt-mode MQTT payload entry, and under real UART timing/URC contention that causes raw data phase timeout without declaring MQTT disconnected. Later replay succeeds because modem MQTT session never actually died; it just gets a cleaner send window.

So classification is:
- primary: prompt handling bug
- secondary: AT bus contention/timing sensitivity
- tertiary: weak recovery sequencing after failed payload phase
- unlikely primary cause: LTE drop or broker disconnect

# Relevant files

- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_publish.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-mqtt-sim7600-at/src/mqtt_session.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/adapter-modem-sim7600-at/src/modem_at.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/domain-storage/src/offline_queue.c`
- `E:/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/components/app-core/src/state_publish_pipeline.c`

# Unresolved questions

- Exact COM5 log timestamps/cadence around each timeout were not provided here, so I could not correlate to a specific concurrent LTE FSM or command RX event.
- Need one full raw modem transcript around a failing `AT+CMQTTPAYLOAD` window to prove whether prompt was late, partial, or consumed by another path.