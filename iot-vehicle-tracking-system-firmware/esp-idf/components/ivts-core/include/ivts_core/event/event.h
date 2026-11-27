/**
 * @file event.h
 * @brief By-value event envelopes published between firmware tasks.
 *
 * Board, modem, OBD, storage and OTA report results through an ivts_sink_t.
 * Large command and diagnostic data stay in an adapter-owned slot and are
 * retrieved through the corresponding component API.
 */
#pragma once
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/base/time.h"
#include "ivts_core/model/gnss.h"
#include "ivts_core/model/obd.h"

/** Maximum byte size of an event stored in the application queue. */
#define IVTS_EVENT_MAX_SIZE 64u

typedef enum {
    IVTS_EV_NONE = 0,
    IVTS_EV_LINK_STATE,      /**< Modem network or broker link change. */
    IVTS_EV_GNSS_FIX,        /**< New GNSS sample from the modem. */
    IVTS_EV_MQTT_ACK,        /**< Result of a QoS 1 modem publish. */
    IVTS_EV_CMD_PENDING,     /**< The modem command FIFO contains new data. */
    IVTS_EV_STORE_RESULT,    /**< A storage request failed. */
    IVTS_EV_QUEUE_READY,     /**< The oldest offline record is available in the peek slot. */
    IVTS_EV_CONFIG_CORRUPT,  /**< The stored configuration failed validation and defaults were loaded. */
    IVTS_EV_OBD_LINK,        /**< OBD BLE, ELM327 or ECU link state changed. */
    IVTS_EV_OBD_SAMPLE,      /**< New OBD PID sample. */
    IVTS_EV_OBD_DIAG_READY,  /**< New OBD readiness or trouble-code snapshot available through obd_diag_copy(). */
    IVTS_EV_POWER_SAMPLE,    /**< Vehicle and device supply voltages in millivolts. */
    IVTS_EV_MOTION_IRQ,      /**< IMU motion interrupt processed by the board task. */
    IVTS_EV_OTA_PROGRESS,    /**< OTA progress or result. */
    IVTS_EV_COUNT
} ivts_event_type_t;

/** Current network and broker connection level. */
typedef enum { IVTS_LINK_DOWN = 0, IVTS_LINK_NET_UP, IVTS_LINK_BROKER_UP } ivts_link_t;

/** Storage operation identified by IVTS_EV_STORE_RESULT. */
typedef enum {
    IVTS_STORE_OP_CONFIG_SAVE = 0,
    IVTS_STORE_OP_LOG_APPEND,
    IVTS_STORE_OP_QUEUE_PUSH,
    IVTS_STORE_OP_QUEUE_POP,
    IVTS_STORE_OP_SD_MOUNT,
    IVTS_STORE_OP_QUEUE_PEEK
} ivts_store_op_t;

/** Motion alarm pending PUBACK. A zero sequence means no pending alarm. */
typedef struct {
    uint64_t unix_ms;
    uint32_t uptime_ms;
    uint32_t boot_id;
    uint32_t seq;
} ivts_motion_alarm_t;

typedef struct {
    uint8_t   type;      /**< ivts_event_type_t. */
    ivts_ms_t ts_ms;     /**< Monotonic milliseconds when this event was produced. */
    union {
        struct { uint8_t link; int32_t err; }                  link_state;
        ivts_gnss_t                                            gnss;
        struct { uint32_t tx_id; uint8_t ok; int16_t err; }    mqtt_ack;
        struct { uint16_t len; }                               cmd_pending;
        struct { uint8_t op; int32_t err; }                    store_result;
        struct { uint32_t pending; }                           queue_ready;
        struct { int32_t err; }                                config_corrupt;
        struct { uint8_t connected; uint8_t elm_ready; uint8_t ecu; } obd_link;
        ivts_obd_sample_t                                      obd_sample;
        struct { uint16_t vehicle_mv; uint16_t device_mv; uint32_t imu_delta_mmps2; } power;
        struct { uint8_t pin_level; uint32_t imu_delta_mmps2; } motion_irq;
        struct { uint8_t phase; uint8_t pct; int32_t err; }    ota_progress;
    } u;
} ivts_event_t;

_Static_assert(sizeof(ivts_event_t) <= IVTS_EVENT_MAX_SIZE,
               "ivts_event_t vuot IVTS_EVENT_MAX_SIZE");

/**
 * @brief Consume an event from a component task without blocking.
 *
 * The app sink copies the event into its queue. Producers invoke it in task
 * context, outside SDK callback and driver locks.
 *
 * @return IVTS_OK on delivery, or IVTS_ERR_FULL when a full queue drops the
 * event.
 */
typedef ivts_err_t (*ivts_sink_fn)(void *ctx, const ivts_event_t *ev);

/** Event sink callback and caller-supplied context. */
typedef struct {
    ivts_sink_fn fn;
    void *ctx;
} ivts_sink_t;

/**
 * @brief Deliver a by-value event through the configured sink.
 * @return The sink's result, or IVTS_ERR_INVALID_ARG for a missing sink,
 * callback or event.
 */
static inline ivts_err_t ivts_sink_emit(const ivts_sink_t *s, const ivts_event_t *ev)
{
    if (s == NULL || s->fn == NULL || ev == NULL) {
        return IVTS_ERR_INVALID_ARG;
    }
    return s->fn(s->ctx, ev);
}

/** @brief Return the stable non-null name of an event type. */
const char *ivts_event_name(ivts_event_type_t t);
