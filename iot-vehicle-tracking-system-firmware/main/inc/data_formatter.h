#pragma once

#include "app_config.h"
#include "app_state.h"

/**
 * @file data_formatter.h
 * @brief JSON payload formatting helpers for MQTT publications.
 */

/**
 * @brief Build raw telemetry payload JSON string.
 *
 * @param cfg Runtime configuration (device/auth metadata).
 * @param telemetry Latest telemetry snapshot.
 *
 * @return Heap-allocated JSON string. Caller must free with `cJSON_free`.
 *         Returns NULL when formatting fails.
 */
char *data_format_rawdata(const config_t *cfg,
                          const telemetry_t *telemetry,
                          bool include_auth_token,
                          bool timestamp_trusted,
                          uint64_t timestamp_ms,
                          const char *message_id,
                          uint32_t seq_no,
                          const char *boot_id);

/**
 * @brief Build status payload JSON string.
 *
 * @param cfg Runtime configuration.
 * @param status Status string such as `running` or `stopped`.
 * @param session_id Optional session identifier (0 to omit).
 *
 * @return Heap-allocated JSON string. Caller must free with `cJSON_free`.
 *         Returns NULL when formatting fails.
 */
char *data_format_status(const config_t *cfg,
                         const char *status,
                         uint32_t session_id,
                         bool include_auth_token,
                         bool timestamp_trusted,
                         uint64_t timestamp_ms,
                         const char *message_id,
                         uint32_t seq_no,
                         const char *boot_id);

/**
 * @brief Build event payload JSON string.
 *
 * @param cfg Runtime configuration.
 * @param event_type Event category.
 * @param code Numeric event code.
 * @param message Optional event message.
 *
 * @return Heap-allocated JSON string. Caller must free with `cJSON_free`.
 *         Returns NULL when formatting fails.
 */
char *data_format_event(const config_t *cfg,
                        const char *event_type,
                        int code,
                        const char *message,
                        bool include_auth_token,
                        bool timestamp_trusted,
                        uint64_t timestamp_ms,
                        const char *message_id,
                        uint32_t seq_no,
                        const char *boot_id);

/**
 * @brief Build firmware-status payload JSON string.
 *
 * @param cfg Runtime configuration.
 * @param status Firmware status payload fields.
 *
 * @return Heap-allocated JSON string. Caller must free with `cJSON_free`.
 *         Returns NULL when formatting fails.
 */
char *data_format_firmware(const config_t *cfg,
                           const firmware_status_t *status,
                           bool include_auth_token,
                           bool timestamp_trusted,
                           uint64_t timestamp_ms,
                           const char *message_id,
                           uint32_t seq_no,
                           const char *boot_id);
