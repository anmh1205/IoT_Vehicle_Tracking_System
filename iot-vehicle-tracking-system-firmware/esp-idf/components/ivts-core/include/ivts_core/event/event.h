/**
 * @file include/ivts_core/event/event.h
 * @brief By-value event envelopes published between firmware tasks.
 *
 * Board, modem, OBD, storage and OTA report through the app's task-context sink.
 * The app sink copies each event into its queue without waiting. The producer
 * owns the event until the sink returns. Command bytes, offline records and
 * OBD diagnostics stay in component-owned slots accessed through their APIs.
 */
#pragma once
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/base/time.h"
#include "ivts_core/model/gnss.h"
#include "ivts_core/model/obd.h"

#define IVTS_EVENT_MAX_SIZE 64u  /**< Maximum event envelope size in bytes. */

/** @brief Event discriminator selecting the active payload, if any. */
typedef enum {
    IVTS_EV_NONE = 0,  /**< No event payload. */
    IVTS_EV_LINK_STATE,      /**< Modem network or broker link change. */
    IVTS_EV_GNSS_FIX,        /**< New GNSS sample from the modem. */
    IVTS_EV_MQTT_ACK,        /**< Result of a QoS 1 modem publish. */
    IVTS_EV_CMD_PENDING,     /**< The modem command FIFO contains new data. */
    IVTS_EV_STORE_RESULT,    /**< A storage request failed. */
    IVTS_EV_QUEUE_READY,     /**< The oldest offline record is available in the peek slot. */
    IVTS_EV_CONFIG_CORRUPT,  /**< A load error other than NOT_FOUND causes defaults to apply. */
    IVTS_EV_OBD_LINK,        /**< OBD BLE, ELM327 or ECU link state changed. */
    IVTS_EV_OBD_SAMPLE,      /**< New OBD PID sample. */
    IVTS_EV_OBD_DIAG_READY,  /**< New OBD readiness or trouble-code snapshot available through obd_diag_copy(). */
    IVTS_EV_POWER_SAMPLE,    /**< Vehicle and device supply voltages in millivolts. */
    IVTS_EV_MOTION_IRQ,      /**< IMU motion interrupt processed by the board task. */
    IVTS_EV_OTA_PROGRESS,    /**< OTA progress or result. */
    IVTS_EV_COUNT  /**< Sentinel after the last event type. */
} ivts_event_type_t;

/** @brief Current network and broker connection level. */
typedef enum { IVTS_LINK_DOWN = 0, /**< The network link is down.
               */ IVTS_LINK_NET_UP, /**< Network is up and the broker is unavailable.
               */ IVTS_LINK_BROKER_UP /**< The broker connection is up. */ } ivts_link_t;

/** @brief Storage operation identified by IVTS_EV_STORE_RESULT. */
typedef enum {
    IVTS_STORE_OP_CONFIG_SAVE = 0,  /**< Configuration save operation identifier. */
    IVTS_STORE_OP_LOG_APPEND,  /**< Appending to the SD log fails. */
    IVTS_STORE_OP_QUEUE_PUSH,  /**< Adding an offline queue record fails. */
    IVTS_STORE_OP_QUEUE_POP,  /**< Removing a record from the offline queue fails. */
    IVTS_STORE_OP_SD_MOUNT,  /**< Preparing SD storage or recovering its queue fails. */
    IVTS_STORE_OP_QUEUE_PEEK  /**< Reading the oldest offline queue record fails. */
} ivts_store_op_t;

/** @brief App-owned motion alarm snapshot retained until delivery is acknowledged. */
typedef struct {
    uint64_t unix_ms;  /**< Trusted event time in Unix milliseconds, or zero if unavailable. */
    uint32_t uptime_ms;  /**< Event time in monotonic milliseconds during the captured boot. */
    uint32_t boot_id;  /**< Boot identifier captured for the alarm message. */
    uint32_t seq;  /**< Alarm message sequence. Zero means no pending alarm. */
} ivts_motion_alarm_t;

/** @brief Producer-owned event copied by value into the app queue. */
typedef struct {
    uint8_t   type;      /**< ivts_event_type_t. */
    ivts_ms_t ts_ms;     /**< Producer timestamp in monotonic milliseconds when supplied. */
    union {
        struct { uint8_t link; /**< ivts_link_t.
                      */ int32_t err; /**< Result associated with the link change.
                      */ }                  link_state;  /**< Link change with its reported error code. */
        ivts_gnss_t                                            gnss;  /**< GNSS sample or loss of fix. */
        struct { uint32_t tx_id; /**< App publish identifier.
                      */ uint8_t ok; /**< One when acknowledged.
                      */ int16_t err; /**< Publish result code.
                      */ }    mqtt_ack;  /**< Terminal result for the publish identified by tx_id. */
        struct { uint16_t len; /**< Queued command bytes.
                      */ }                               cmd_pending;  /**< Queued command notification. */
        struct { uint8_t op; /**< ivts_store_op_t.
                      */ int32_t err; /**< ivts_err_t failure.
                      */ }                    store_result;  /**< Storage operation and its failure result. */
        struct { uint32_t pending; /**< Pending record count.
                      */ }                           queue_ready;  /**< Offline peek slot is ready. */
        struct { int32_t err; /**< Configuration load result.
                      */ }                                config_corrupt;  /**< Configuration load failure. */
        struct { uint8_t connected; /**< One when BLE is connected.
                      */ uint8_t elm_ready; /**< One when the ELM327 is ready.
                      */ uint8_t ecu; /**< ivts_ecu_state_t.
                      */ } obd_link;  /**< BLE connection, ELM327 readiness and ECU state. */
        ivts_obd_sample_t                                      obd_sample;  /**< PID sample and validity. */
        struct { uint16_t vehicle_mv; /**< Vehicle supply in mV.
                      */ uint16_t device_mv; /**< Device supply in mV.
                      */ uint32_t imu_delta_mmps2; /**< Acceleration deviation in mm/s^2.
                      */ } power;  /**< Vehicle and device voltages and IMU acceleration deviation. */
        struct { uint8_t pin_level; /**< Observed GPIO level, zero or one.
                      */ uint32_t imu_delta_mmps2; /**< Acceleration deviation in mm/s^2.
                      */ } motion_irq;  /**< Sampled IMU interrupt pin level and acceleration deviation. */
        struct { uint8_t phase; /**< ivts_ota_status_t.
                      */ uint8_t pct; /**< Progress, 0 through 100 percent.
                      */ int32_t err; /**< ivts_ota_err_t.
                      */ }    ota_progress;  /**< OTA phase, progress percentage and error. */
    } u;  /**< By-value payload selected by type. */
} ivts_event_t;

_Static_assert(sizeof(ivts_event_t) <= IVTS_EVENT_MAX_SIZE,
               "ivts_event_t vuot IVTS_EVENT_MAX_SIZE");

/**
 * @brief Consume an event from a component task without blocking.
 *
 * The app sink copies the event into its queue. Producers invoke it in task
 * context, outside SDK callback and driver locks.
 *
 * @param ctx Borrowed callback context, which can be NULL if the sink allows it.
 * @param ev Required event borrowed for the call. The app sink copies it by value.
 * @retval IVTS_OK The app queue accepts the event.
 * @retval IVTS_ERR_FULL The app queue is full and drops the event.
 *
 * @note Context: Producer task or boot caller in task context. Blocking: non-blocking.
 */
typedef ivts_err_t (*ivts_sink_fn)(void *ctx, const ivts_event_t *ev);

/** @brief Sink binding copied by components. The registrant keeps the callback and context valid. */
typedef struct {
    ivts_sink_fn fn;  /**< Non-blocking callback invoked in the producer context. */
    void *ctx;  /**< Borrowed callback context, which may be NULL. */
} ivts_sink_t;

/**
 * @brief Deliver an event through the configured sink.
 * @param s Sink binding borrowed for the call. A NULL binding is invalid.
 * @param ev Required event borrowed for the call.
 * @retval IVTS_ERR_INVALID_ARG The binding, callback or event is NULL.
 * @return The callback result when all arguments are valid.
 *
 * @note Context: Producer task or boot caller in task context. Blocking: non-blocking by sink contract.
 */
static inline ivts_err_t ivts_sink_emit(const ivts_sink_t *s, const ivts_event_t *ev)
{
    if (s == NULL || s->fn == NULL || ev == NULL) {
        return IVTS_ERR_INVALID_ARG;
    }
    return s->fn(s->ctx, ev);
}

/**
 * @brief Return the stable name of an event type.
 * @param t Event discriminator to name.
 * @return Immutable static string, or "UNKNOWN" for the sentinel or an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_event_name(ivts_event_type_t t);
