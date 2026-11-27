/**
 * @file components/ivts-core/include/ivts_core/fsm/fsm.h
 * @brief Portable FSM inputs, action outputs, configuration and step interface.
 *
 * The caller supplies observations and time through ivts_fsm_in_t. The pure
 * step returns the requested actions in ivts_fsm_out_t for the app to execute.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/time.h"
#include "ivts_core/fsm/state.h"
#include "ivts_core/model/telemetry.h"

/** Reason for the current wake cycle. */
typedef enum { IVTS_WAKE_POWER_ON = 0, IVTS_WAKE_TIMER, IVTS_WAKE_MOTION, IVTS_WAKE_OTHER } ivts_wake_t;

/** FSM settings derived from device configuration and board capability. */
typedef struct {
    uint32_t tracking_ms;        /**< RAW publish interval while driving, in milliseconds. */
    uint32_t alarm_ms;           /**< RAW publish interval during an alarm, in milliseconds. */
    uint32_t alarm_timeout_ms;   /**< Quiet time before leaving ALARM, in milliseconds. */
    uint32_t heartbeat_s;        /**< Sleep interval between timer wakes, in seconds. */
    uint32_t status_ms;          /**< Status publish interval while driving, in milliseconds. */
    uint32_t check_ign_max_ms;   /**< Treat ignition UNKNOWN as OFF after this timeout. */
    uint32_t parked_settle_ms;   /**< Minimum time in PARKED before sleep is permitted. */
    uint32_t awake_max_ms;       /**< Maximum awake time in HEARTBEAT or PARKED, including pending delivery. */
    bool     sleep_enabled;      /**< False selects simulated sleep with hardware still powered. */
    bool     imu_wakeup_enabled; /**< Allow IMU wake. */
    bool     deep_wake_on_motion;/**< The IMU interrupt pin supports deep-sleep wake. */
} ivts_fsm_cfg_t;

/** Observations used for one FSM step. */
typedef struct {
    ivts_ms_t       now;
    ivts_ignition_t ignition;
    ivts_motion_t   motion;
    ivts_wake_t     wake;          /**< Wake reason used after boot or light sleep. */
    bool            link_up;       /**< The MQTT broker connection is up. */
    bool            link_expected; /**< A provisioned device can wait for the broker until the awake deadline. */
    bool            publish_idle;  /**< No publish is waiting for its ACK. */
    bool            control_pending; /**< At least one control message remains unsent. */
    uint32_t        offline_record_count; /**< Count of pending offline records. */
    bool            ota_active;    /**< An active or unconfirmed OTA prevents sleep. */
} ivts_fsm_in_t;

#define IVTS_ACT_PUBLISH_RAW    (1u << 0)  /**< Publish one RAW message. */
#define IVTS_ACT_PUBLISH_STATUS (1u << 1)  /**< Publish one status message. */
#define IVTS_ACT_GNSS_ON        (1u << 2)
#define IVTS_ACT_GNSS_OFF       (1u << 3)
#define IVTS_ACT_OBD_START      (1u << 4)
#define IVTS_ACT_OBD_STOP       (1u << 5)
#define IVTS_ACT_SLEEP          (1u << 6)  /**< Enter the sleep mode with the duration and motion-wake flag in the output. */
#define IVTS_ACT_REPLAY         (1u << 7)  /**< Request offline replay. The app suppresses duplicate requests. */

/** Actions and state change from one FSM step. */
typedef struct {
    uint32_t          actions;          /**< Bit mask of IVTS_ACT_* actions. */
    ivts_sleep_mode_t sleep_mode;       /**< Enable motion wake for IVTS_ACT_SLEEP when supported. */
    uint32_t          sleep_s;          /**< Enable motion wake for IVTS_ACT_SLEEP when supported. */
    bool              sleep_arm_motion; /**< Enable motion wake for IVTS_ACT_SLEEP when supported. */
    bool              changed;          /**< True if the state changed in this step. */
} ivts_fsm_out_t;

typedef struct {
    ivts_fsm_state_t state;
    ivts_ms_t        entered_ms;      /**< Monotonic time when the FSM entered the current state. */
    ivts_ms_t        last_raw_ms;     /**< Last RAW publish time. Zero means no RAW in this state. */
    ivts_ms_t        last_status_ms;
    bool             status_sent;     /**< A status message was sent in this state. */
    ivts_wake_t      wake;            /**< Reason for the current wake cycle. */
    ivts_sleep_mode_t sleep_mode;      /**< Mode selected when entering IVTS_ST_SLEEP. */
} ivts_fsm_t;

/** @brief Initialize the FSM in IVTS_ST_INIT using the supplied time and wake reason. */
void ivts_fsm_init(ivts_fsm_t *f, ivts_ms_t now, ivts_wake_t wake);

/**
 * @brief Run one pure FSM step.
 * @param[in,out] f Mutable FSM state owned by the caller.
 * @param c Runtime policy and scheduling settings.
 * @param in Current observations and monotonic time.
 * @param[out] out Requested actions. Cleared before the step fills it.
 */
void ivts_fsm_step(ivts_fsm_t *f, const ivts_fsm_cfg_t *c, const ivts_fsm_in_t *in, ivts_fsm_out_t *out);

/**
 * @brief Resume at CHECK_IGN and record the new wake reason.
 */
void ivts_fsm_woke(ivts_fsm_t *f, ivts_ms_t now, ivts_wake_t wake);

/** @brief Map an internal app state to the device state sent to the cloud. */
ivts_device_state_t ivts_fsm_device_state(ivts_fsm_state_t s);
