/**
 * @file src/app_internal.h
 * @brief Shared app clock, message identity and timing declarations.
 *
 * Monotonic uptime drives app deadlines. Application and OTA code use the board RTC for trusted UTC.
 * Startup restores the message sequence, then the app task owns it and saves it before sleep.
 * These interfaces do not allocate boot identity or persist application records.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>

/**
 * @brief Read monotonic uptime.
 *
 * @return Whole milliseconds since the current boot.
 *
 * @note Context: Application tasks. Blocking: non-blocking.
 */
uint64_t app_now(void);

/**
 * @brief Read trusted UTC from the board RTC.
 *
 * @param[out] trusted_out Optional flag set on every call. True means the reading is trusted.
 * @return Unix milliseconds when trusted, or zero if the RTC is unavailable, unreadable or untrusted.
 *
 * @note Context: App and OTA tasks. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a
 * 50 ms transfer timeout.
 */
uint64_t app_clock_unix_ms_or_zero(bool *trusted_out);

#define APP_TAG "app"  /**< UART log tag for application lines. */

/**
 * @brief Allocate the next message sequence.
 *
 * @return Incremented unsigned 32-bit counter. Arithmetic wraps at the type limit.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
uint32_t app_msg_seq_next(void);
/**
 * @brief Read the last allocated or restored sequence.
 *
 * @return Current unsigned 32-bit message sequence.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
uint32_t app_msg_seq_current(void);
/**
 * @brief Set the in-memory sequence to a retained value.
 *
 * @param seq Last sequence for this boot identity, or zero for a new identity.
 *
 * @note Context: Startup task before the app task starts, then the app task. Blocking: non-blocking.
 */
void app_msg_seq_restore(uint32_t seq);

#define APP_TICK_MS                100u  /**< Runtime service interval and initial event wait in milliseconds. */
#define INIT_RESTART_DELAY_MS    10000u  /**< Startup failure delay before restart in milliseconds. */
#define OTA_REBOOT_DELAY_MS      20000u  /**< OTA report window after observing reboot progress, in milliseconds. */
#define CMD_RESTART_DELAY_MS     20000u  /**< Restart deadline offset after a receipt checkpoint, in milliseconds. */
#define NVS_RETRY_MS              5000u  /**< Session transition save retry delay in milliseconds. */
#define BOUNDARY_RETRY_MS         5000u  /**< Delay between boundary publish attempts in milliseconds. */
#define ALARM_RETRY_MS            5000u  /**< Delay between motion alarm attempts in milliseconds. */
#define PEEK_RETRY_MS             5000u  /**< Delay before retrying an outstanding storage peek in milliseconds. */
#define ACK_RETRY_MS              1000u  /**< Delay after command ACK or receipt checkpoint failure in milliseconds. */
#define OTA_MARK_VALID_RETRY_MS   1000u  /**< Delay after a failed OTA mark-valid attempt in milliseconds. */
#define OTA_ROLLBACK_RETRY_MS     5000u  /**< Delay after a failed automatic rollback in milliseconds. */
#define LOCATION_TIMEOUT_MS      90000u  /**< Location command deadline offset in milliseconds. */
#define OBD_SAMPLE_MAX_AGE_MS    30000u  /**< Maximum OBD sample age for RAW capture in milliseconds. */
#define MOTION_QUIET_MS          30000u  /**< Motion-free interval before reporting stationary, in milliseconds. */
#define STATUS_PERIOD_MS         60000u  /**< FSM status interval while driving, in milliseconds. */
#define CHECK_IGN_MAX_MS          5000u  /**< Ignition check timeout in milliseconds. */
#define PARKED_SETTLE_MS         20000u  /**< Parked settle interval before sleep in milliseconds. */
#define AWAKE_MAX_MS             90000u  /**< FSM parked or heartbeat awake window in milliseconds. */
#define MODEM_STOP_WAIT_MS        8000u  /**< Modem shutdown deadline offset before sleep, in milliseconds. */
#define DIAG_PERIOD_MS           60000u  /**< Diagnostic stack and heap logging interval in milliseconds. */
