#pragma once
#include <stdbool.h>
#include <stdint.h>

/** Read monotonic milliseconds since boot. */
uint64_t app_now(void);

/** Read the board RTC, returning zero when untrusted. May wait for the I2C bus. */
uint64_t app_clock_unix_ms_or_zero(bool *trusted_out);

#define APP_TAG "app"

/* Allocate and inspect message sequence numbers in the app task. */
uint32_t app_msg_seq_next(void);
uint32_t app_msg_seq_current(void);
/* Restore the sequence when loading or saving a deep-sleep RTC context. */
void app_msg_seq_restore(uint32_t seq);

#define APP_TICK_MS                100u
#define INIT_RESTART_DELAY_MS    10000u
#define OTA_REBOOT_DELAY_MS      20000u
#define CMD_RESTART_DELAY_MS     20000u
#define NVS_RETRY_MS              5000u
#define BOUNDARY_RETRY_MS         5000u
#define ALARM_RETRY_MS            5000u
#define PEEK_RETRY_MS             5000u
#define ACK_RETRY_MS              1000u
#define OTA_MARK_VALID_RETRY_MS   1000u
#define OTA_ROLLBACK_RETRY_MS     5000u
#define LOCATION_TIMEOUT_MS      90000u  /* GNSS cold start within the cloud command TTL. */
#define OBD_SAMPLE_MAX_AGE_MS    30000u
#define MOTION_QUIET_MS          30000u
#define STATUS_PERIOD_MS         60000u
#define CHECK_IGN_MAX_MS          5000u
#define PARKED_SETTLE_MS         20000u
#define AWAKE_MAX_MS             90000u
#define MODEM_STOP_WAIT_MS        8000u
#define DIAG_PERIOD_MS           60000u
