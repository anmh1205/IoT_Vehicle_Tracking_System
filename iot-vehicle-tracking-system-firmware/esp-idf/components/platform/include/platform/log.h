/**
 * @file include/platform/log.h
 * @brief Standard UART log line shared by every firmware component.
 *
 * Firmware components use these wrappers from task context. They inherit the SDK logging
 * level filtering, console I/O and possible wait for its lock. Format strings and arguments
 * are supplied by the caller for the duration of the call.
 *
 * Use the following shape for console lines.
 *
 * @code
 * <L> (<uptime ms>) <tag>: <subject> [<action>] key=value key=value ...
 *
 * I (5321) board: boot reset=POWERON wake=timer rtc=ok imu=ok
 * I (8123) modem: lte REG -> PDP took=2.1s
 * W (9050) modem: at fail cmd="AT+CGACT=1,1" result=timeout resp=""
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
 * - Use printable ASCII. Keep credentials, tokens and signed URLs out of log arguments.
 *   AT callers mark sensitive commands for redaction in completion logs.
 *
 * Error covers data loss or a disabled function. Warning covers degraded operation, retries
 * and recovery. Info covers boot, transitions, milestones and periodic status. Debug covers
 * per-message and per-sample detail. The layer tests check tags and log subjects.
 */
#pragma once
#include "esp_log.h"

#define IVTS_LOGE(tag, ...) ESP_LOGE(tag, __VA_ARGS__) /**< Emit an error for data loss or a disabled function. */
#define IVTS_LOGW(tag, ...) ESP_LOGW(tag, __VA_ARGS__) /**< Emit a warning for degradation or recovery. */
#define IVTS_LOGI(tag, ...) ESP_LOGI(tag, __VA_ARGS__) /**< Emit an event, milestone or status line. */
#define IVTS_LOGD(tag, ...) ESP_LOGD(tag, __VA_ARGS__) /**< Emit debug detail when enabled for the tag. */

#define IVTS_LOG_TAGS { "board", "modem", "at", "storage", "obd", "ota", "app", "sys" } /**< Tags for DEBUG. */

#define IVTS_LOG_OK(value) ((value) ? "ok" : "fail") /**< Render a success flag as ok or fail. */
#define IVTS_LOG_YES(value) ((value) ? "yes" : "no") /**< Render a boolean as yes or no. */
