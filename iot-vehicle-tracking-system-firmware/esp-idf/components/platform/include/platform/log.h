/**
 * @file log.h
 * @brief Standard UART log line shared by every firmware component.
 *
 * Every console line has the same shape:
 *
 * @code
 * <L> (<uptime ms>) <tag>: <subject> [<action>] key=value key=value ...
 *
 * I (5321) board: boot reset=POWERON wake=timer rtc=ok imu=ok
 * I (8123) modem: lte REG -> PDP took=2.1s
 * W (9050) at: fail cmd="AT+CGACT=1,1" result=timeout resp=""
 * I (12000) app: state PARKED -> DRIVING
 * I (20000) app: status fsm=DRIVING ign=ON motion=MOVING link=BROKER_UP queue=0
 * D (20450) app: publish ok kind=raw_live tx=12 boot=41 seq=1003 rtt=350ms
 * @endcode
 *
 * - `<tag>` is the owning component: `board`, `modem`, `at`, `storage`, `obd`,
 *   `ota`, `app` or `sys`. Hardware chips report through the adapter that
 *   owns them, so the subject names the chip (`rtc`, `imu`, `adc`, `i2c`).
 * - `<subject>` is a lower-case word, optionally followed by an action or a
 *   transition `FROM -> TO`.
 * - Fields are `key=value`. Units are part of the value (`13.52V`, `350ms`,
 *   `-71dBm`), enum values use upper-case names and results use `ok`, `fail`,
 *   `timeout`, `yes` or `no`. Quote a value that may contain spaces or commas.
 * - Text is printable ASCII. Credentials, tokens and signed URLs are never
 *   logged; AT commands that carry them are redacted.
 *
 * Levels: E = data lost or a function disabled; W = degraded, retried or
 * recovered; I = boot, state change, milestone and periodic `status` lines;
 * D = per-message and per-sample detail (publish, AT traffic, ADC samples).
 * tests/test_layers.py enforces this format.
 */
#pragma once
#include "esp_log.h"

#define IVTS_LOGE(tag, ...) ESP_LOGE(tag, __VA_ARGS__)
#define IVTS_LOGW(tag, ...) ESP_LOGW(tag, __VA_ARGS__)
#define IVTS_LOGI(tag, ...) ESP_LOGI(tag, __VA_ARGS__)
#define IVTS_LOGD(tag, ...) ESP_LOGD(tag, __VA_ARGS__)

/** Every firmware log tag, used to raise them together to DEBUG. */
#define IVTS_LOG_TAGS { "board", "modem", "at", "storage", "obd", "ota", "app", "sys" }

/** Render a success flag as `ok` or `fail`. */
#define IVTS_LOG_OK(value) ((value) ? "ok" : "fail")
/** Render a boolean as `yes` or `no`. */
#define IVTS_LOG_YES(value) ((value) ? "yes" : "no")
