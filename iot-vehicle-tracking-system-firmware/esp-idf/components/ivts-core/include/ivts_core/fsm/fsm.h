/**
 * @file include/ivts_core/fsm/fsm.h
 * @brief Portable FSM inputs, action outputs, configuration and step interface.
 *
 * The app task owns the mutable FSM and supplies current observations and time.
 * The core computes action flags and sleep parameters synchronously. App runtime
 * code performs the actions and tracks actual delivery and hardware state.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/time.h"
#include "ivts_core/fsm/state.h"
#include "ivts_core/model/telemetry.h"

/** @brief Wake reason latched for the current app cycle. */
typedef enum { IVTS_WAKE_POWER_ON = 0, /**< Startup reported as power-on.
               */ IVTS_WAKE_TIMER, /**< Heartbeat timer wake.
               */ IVTS_WAKE_MOTION, /**< IMU motion wake.
               */ IVTS_WAKE_OTHER /**< Other wake reason. */ } ivts_wake_t;

/** @brief Caller-owned FSM policy derived from device configuration and board capability. */
typedef struct {
    uint32_t tracking_ms;        /**< RAW publish interval while driving, in milliseconds. */
    uint32_t alarm_ms;           /**< RAW publish interval during an alarm, in milliseconds. */
    uint32_t alarm_timeout_ms;   /**< Minimum ALARM residence in ms. Exit also requires motion to clear. */
    uint32_t heartbeat_s;        /**< Sleep interval between timer wakes, in seconds. */
    uint32_t status_ms;          /**< Status publish interval while driving, in milliseconds. */
    uint32_t check_ign_max_ms;   /**< Treat ignition UNKNOWN as OFF after this timeout. */
    uint32_t parked_settle_ms;   /**< Minimum time in PARKED before sleep is permitted. */
    uint32_t awake_max_ms;       /**< Awake budget in ms. Expiry relaxes backlog checks while idle. */
    bool     sleep_enabled;      /**< False selects simulated sleep with hardware still powered. */
    bool     imu_wakeup_enabled; /**< Allow IMU wake. */
    bool     deep_wake_on_motion;/**< The IMU interrupt pin supports deep-sleep wake. */
} ivts_fsm_cfg_t;

/** @brief Caller-owned observations borrowed for one step. */
typedef struct {
    ivts_ms_t       now;  /**< Current monotonic milliseconds since boot. */
    ivts_ignition_t ignition;  /**< Current debounced ignition state. */
    ivts_motion_t   motion;  /**< Current inferred motion state. */
    ivts_wake_t     wake;          /**< Caller wake observation. Transitions use the latched FSM value. */
    bool            link_up;       /**< The MQTT broker connection is up. */
    bool            link_expected; /**< A provisioned device can wait for the broker until the awake deadline. */
    bool            publish_idle;  /**< No publish or offline queue write is in progress. */
    bool            control_pending; /**< App reports pending control delivery or command handling. */
    uint32_t        offline_record_count; /**< Count of pending offline records. */
    bool            ota_active;    /**< App reports OTA or another command-related sleep inhibitor. */
} ivts_fsm_in_t;

#define IVTS_ACT_PUBLISH_RAW    (1u << 0)  /**< Publish one RAW message. */
#define IVTS_ACT_PUBLISH_STATUS (1u << 1)  /**< Publish one status message. */
#define IVTS_ACT_GNSS_ON        (1u << 2)  /**< Request GNSS activation. */
#define IVTS_ACT_GNSS_OFF       (1u << 3)  /**< Request GNSS deactivation. */
#define IVTS_ACT_OBD_START      (1u << 4)  /**< Request the OBD session to start. */
#define IVTS_ACT_OBD_STOP       (1u << 5)  /**< Request the OBD session to stop. */
#define IVTS_ACT_SLEEP          (1u << 6)  /**< Enter the sleep mode with the duration and motion-wake flag in the output. */
#define IVTS_ACT_REPLAY         (1u << 7)  /**< Request offline replay. The app suppresses duplicate requests. */

/** @brief Caller-owned action and transition output for one step. */
typedef struct {
    uint32_t          actions;          /**< Bit mask of IVTS_ACT_* actions. */
    ivts_sleep_mode_t sleep_mode;       /**< Selected hardware or simulated sleep mode for IVTS_ACT_SLEEP. */
    uint32_t          sleep_s;          /**< Timer wake delay in seconds for IVTS_ACT_SLEEP. */
    bool              sleep_arm_motion; /**< Enable motion wake for IVTS_ACT_SLEEP when supported. */
    bool              changed;          /**< True if the state changed in this step. */
} ivts_fsm_out_t;

/** @brief Mutable state owned by the app task. */
typedef struct {
    ivts_fsm_state_t state;  /**< Current app state. */
    ivts_ms_t        entered_ms;      /**< Monotonic time when the FSM entered the current state. */
    ivts_ms_t        last_raw_ms;     /**< Last RAW request in ms since boot, or zero for none. */
    ivts_ms_t        last_status_ms;  /**< Monotonic milliseconds of the latest status request. */
    bool             status_sent;     /**< The FSM requests status at least once in the current state. */
    ivts_wake_t      wake;            /**< Reason for the current wake cycle. */
    ivts_sleep_mode_t sleep_mode;      /**< Mode selected when entering IVTS_ST_SLEEP. */
} ivts_fsm_t;

/**
 * @brief Initialize the FSM in IVTS_ST_INIT.
 * @param[out] f Required caller-owned FSM. All fields are initialized.
 * @param now Current monotonic milliseconds since boot.
 * @param wake Reason for the current wake cycle.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void ivts_fsm_init(ivts_fsm_t *f, ivts_ms_t now, ivts_wake_t wake);

/**
 * @brief Advance the FSM and request application actions.
 *
 * The step resets the output before dispatch. Publish timers advance when the FSM requests a send.
 * The app executes the requested actions and supplies the resulting observations on later steps.
 *
 * @param[in,out] f Required initialized FSM owned by the caller.
 * @param c Required borrowed timing and sleep policy.
 * @param in Required borrowed observations and monotonic time.
 * @param[out] out Required caller-owned output. All fields are initialized for this step.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void ivts_fsm_step(ivts_fsm_t *f, const ivts_fsm_cfg_t *c, const ivts_fsm_in_t *in, ivts_fsm_out_t *out);

/**
 * @brief Resume at IVTS_ST_CHECK_IGN and latch the wake reason.
 * @param[in,out] f Required initialized FSM.
 * @param now Current monotonic milliseconds since boot.
 * @param wake Reason for resuming.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void ivts_fsm_woke(ivts_fsm_t *f, ivts_ms_t now, ivts_wake_t wake);

/**
 * @brief Map an app FSM state to the reported device state.
 * @param s App state to map.
 * @return Corresponding device state. Unrecognized states and the sentinel map to IVTS_DEV_FAULT.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_device_state_t ivts_fsm_device_state(ivts_fsm_state_t s);
