/**
 * @file include/board/board_power.h
 * @brief Board sleep entry, wake reporting and automatic light-sleep configuration.
 *
 * The app coordinates radio shutdown before explicit sleep and owns the scheduling policy.
 * The board configures ESP-IDF wake sources and returns the wake classification by value.
 * Explicit sleep can suspend the calling task or resume by rebooting.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"

/** @brief Board classification of the SDK wake-source bitmap. */
typedef enum {
    BOARD_WAKE_POWER_ON = 0,   /**< Zero or undefined wake-source bitmap. */
    BOARD_WAKE_TIMER,   /**< Timer wake with no GPIO wake bit. */
    BOARD_WAKE_IMU,   /**< A GPIO, EXT0 or EXT1 wake bit, or an already asserted armed INT1. */
    BOARD_WAKE_OTHER   /**< Another wake reason or rejected sleep. */
} board_wake_t;

/** @brief Caller-owned sleep request borrowed until sleep entry returns or the device resets. */
typedef struct {
    bool     deep;       /**< False selects light sleep and returns on wake. True selects deep sleep. */
    uint32_t seconds;    /**< Timer wake interval in seconds. */
    bool     arm_imu;    /**< Allow IMU wake when the INT GPIO supports the selected sleep mode. */
} board_sleep_req_t;

/**
 * @brief Report whether the board can arm INT1 for deep-sleep wake.
 * @retval true The board declares INT1 an RTC GPIO and the SDK accepts it as a wake GPIO.
 * @retval false INT1 cannot be armed for deep-sleep wake on this configuration.
 * @note Context: App startup or task context. Non-blocking.
 */
bool board_motion_deep_wake_capable(void);
/**
 * @brief Configure CPU frequency scaling and idle light sleep.
 *
 * @param enabled True permits automatic light sleep when the SDK power manager allows it.
 * @retval IVTS_OK Configuration applies, or SDK power management is disabled at build time.
 * @retval IVTS_ERR_INVALID_ARG The SDK rejects the configuration.
 * @retval IVTS_ERR_INVALID_STATE The SDK reports an invalid state.
 * @retval IVTS_ERR_TIMEOUT The SDK reports a timeout.
 * @retval IVTS_ERR_NOT_FOUND The SDK reports a missing resource.
 * @retval IVTS_ERR_IO Another SDK error.
 * @note Context: App startup. Synchronous SDK power-management configuration with no explicit wait.
 */
ivts_err_t board_set_auto_light_sleep(bool enabled);

/**
 * @brief Return the boot wake reason captured by board initialization.
 * @return Cached boot classification. Later light sleeps leave it unchanged.
 * @note Context: Task context after board initialization. Non-blocking.
 */
board_wake_t board_wake_cause(void);

/**
 * @brief Return the lower-case log name of a wake reason.
 * @param wake Board wake classification. Unrecognized values map to the other category.
 * @return Borrowed static log string.
 * @note Context: Task context. Non-blocking.
 */
const char *board_wake_name(board_wake_t wake);

/**
 * @brief Arm wake sources and enter the requested sleep mode.
 *
 * Prior wake sources are disabled before the timer is armed. An already asserted armed INT1
 * notifies the board task and returns immediately. A rejected light sleep can also report pending INT1.
 *
 * @param req Borrowed sleep request. NULL returns BOARD_WAKE_OTHER.
 * @return Wake or skip classification. Successful deep sleep resumes at boot.
 * @note Context: App task after radio shutdown. Light sleep blocks until wake or SDK rejection.
 */
board_wake_t board_sleep(const board_sleep_req_t *req);
