/**
 * @file src/modem_internal.h
 * @brief Private modem task, event, slot and link interfaces.
 *
 * Startup installs immutable configuration and topic strings before the modem task starts.
 * The modem task owns link sequencing and UART protocol state. The task queue copies requests, and
 * HTTP requests borrow buffers until the task signals completion. The slot mutex protects MQTT copies.
 * Services implement the protocol work. The app supplies policy and consumes event snapshots.
 */
#pragma once
#include "modem/modem.h"
#include "esp_err.h"
#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include <stdbool.h>
#include "ivts_core/base/err.h"

#define MODEM_TAG "modem" /**< Log tag for modem service and lifecycle events. */
#define AT_TAG    "at" /**< Separate command and URC trace tag that can be enabled independently. */

/**
 * @brief Borrow the modem configuration snapshot.
 *
 * @return Read-only storage owned by the modem for the boot lifetime.
 * @note Context: Modem task after startup. Blocking: Non-blocking.
 */
const modem_cfg_t *modem_config(void);
/**
 * @brief Borrow the topic name for an outbound publish.
 *
 * @param topic Valid publish topic in the range below MODEM_TOPIC_COUNT.
 * @return NUL-terminated modem-owned topic string, valid for the boot lifetime after initialization.
 * @note Context: Modem task after startup. Blocking: Non-blocking.
 */
const char *modem_topic_name(modem_topic_t topic);
/**
 * @brief Borrow the topic name used to receive cloud commands.
 *
 * @return NUL-terminated modem-owned topic string, valid for the boot lifetime after initialization.
 * @note Context: Modem task after startup. Blocking: Non-blocking.
 */
const char *modem_command_topic(void);
/**
 * @brief Read monotonic modem time.
 *
 * @return Milliseconds since boot.
 * @note Context: Modem task. Blocking: Non-blocking.
 */
uint64_t modem_now(void);
/**
 * @brief Deliver a modem event through the configured sink.
 *
 * The sink result is discarded. The app sink copies the event before returning.
 *
 * @param event Required event borrowed only for the sink call.
 * @note Context: Modem task. Blocking: Invokes the sink synchronously. The sink contract allows no wait.
 */
void modem_emit(const ivts_event_t *event);
/**
 * @brief Update the link snapshot and emit a notification on change.
 *
 * An unchanged link value suppresses the event even if the error differs. The snapshot updates before delivery.
 *
 * @param link New ivts_link_t value stored as a byte.
 * @param error Error detail sent with the transition, or zero for an ordinary transition.
 * @note Context: Modem task. Blocking: Non-blocking atomic update and synchronous sink call.
 */
void modem_emit_link(uint8_t link, int32_t error);
/**
 * @brief Update the logical stopped snapshot visible to the app.
 *
 * @param stopped True at completion of the link-down path. False when the modem task begins link startup.
 * @note Context: Modem task. Blocking: Non-blocking atomic write.
 */
void modem_set_stopped(bool stopped);

/** @brief Operation carried by a modem request queue entry. */
typedef enum {
    REQ_LINK = 0,     /**< Set link demand from the on flag. */
    REQ_GNSS,         /**< Set GNSS demand from the on flag. */
    REQ_PUB_KICK,     /**< Wake the modem loop after accepting an outbound payload. */
    REQ_HTTP_OPEN,    /**< Open the HTTP byte source. */
    REQ_HTTP_READ,    /**< Read a range from the open HTTP source. */
    REQ_HTTP_CLOSE    /**< Close the HTTP byte source. */
} modem_req_op_t;

struct modem_rpc;

/**
 * @brief Request copied by value into the modem work queue.
 *
 * HTTP requests borrow caller-owned input and output buffers. The submitting
 * task waits for completion before returning and releasing that storage.
 */
typedef struct {
    uint8_t           op;       /**< Operation code from modem_req_op_t. */
    bool              on;       /**< Requested state for REQ_LINK and REQ_GNSS. */
    const char       *url;      /**< NUL-terminated REQ_HTTP_OPEN URL owned by the waiting caller. */
    uint8_t          *buf;      /**< Borrowed REQ_HTTP_READ destination of at least len bytes. */
    size_t            len;      /**< REQ_HTTP_READ destination capacity in bytes. */
    uint32_t          offset;   /**< REQ_HTTP_READ offset in the content, in bytes. */
    size_t           *got;      /**< Borrowed REQ_HTTP_READ output byte count. */
    uint32_t         *size;     /**< Borrowed REQ_HTTP_OPEN content size output in bytes. */
    int              *status;   /**< Borrowed REQ_HTTP_OPEN HTTP status output. */
    struct modem_rpc *reply;    /**< Completion state owned by the waiting task. NULL for asynchronous requests. */
} modem_req_t;

/**
 * @brief Initialize modem I/O and start the sole consumer of the request queue.
 *
 * @param cfg Required startup configuration borrowed for hardware and task setup.
 * @return ESP_OK on success, the first hardware setup error, or ESP_ERR_NO_MEM for queue or task creation failure.
 * @note Context: Modem initialization before concurrent use. Blocking: Synchronous driver setup and allocation.
 * @warning Partial startup can leave resources allocated.
 */
esp_err_t modem_task_start(const modem_cfg_t *cfg);
/**
 * @brief Copy a request into the modem task queue.
 *
 * @param request Required descriptor borrowed for the send. Any referenced buffers outlive completion.
 * @param timeout_ms Maximum queue-space wait in milliseconds before tick conversion. Zero tries once.
 * @retval IVTS_OK The queue accepts the copy.
 * @retval IVTS_ERR_INVALID_STATE The request queue is absent.
 * @retval IVTS_ERR_FULL The queue has no free entry within the wait.
 * @note Context: App, startup or OTA task. Blocking: Waits for space for at most the converted timeout.
 */
ivts_err_t modem_task_post(const modem_req_t *request, uint32_t timeout_ms);

/**
 * @brief Submit an HTTP request and wait until the modem releases its buffers.
 *
 * @param request Required mutable HTTP request and borrowed buffers, valid through return.
 *                The function installs a temporary reply pointer that expires on return.
 * @retval IVTS_OK The operation succeeds or the modem attempts HTTP close.
 * @retval IVTS_ERR_FULL Reply allocation or queue submission fails.
 * @retval IVTS_ERR_INVALID_STATE HTTP open is requested before the packet-data step.
 * @retval IVTS_ERR_INVALID_ARG The operation or open URL is invalid.
 * @retval IVTS_ERR_TIMEOUT The HTTP action ends without a successful AT result.
 * @retval IVTS_ERR_IO HTTP setup, response or read fails.
 * @note Context: OTA worker. Blocking: Waits for queue space for up to 1000 ms after tick conversion,
 *       then waits without a timeout on the reply semaphore.
 * @warning Calling from the modem task would prevent the request from being serviced.
 */
ivts_err_t modem_task_call(modem_req_t *request);

/**
 * @brief Allocate the mutex that protects publish slot and command FIFO copies.
 *
 * @retval true The mutex is available.
 * @retval false Allocation fails.
 * @note Context: Modem initialization before concurrent use. Blocking: Synchronous heap allocation.
 */
bool modem_slots_init(void);

/**
 * @brief Claim the queued publish and borrow its slot payload.
 *
 * @param[out] topic Required queued topic ID.
 * @param[out] payload Required pointer output for the slot-owned bytes, valid until modem_tx_done().
 * @param[out] len Required payload length in bytes.
 * @param[out] tx_id Required caller-selected transaction ID.
 * @retval true The modem task claims the slot and all outputs are written.
 * @retval false No unclaimed publish is queued and all outputs are untouched.
 * @note Context: Modem task. Blocking: Waits without a timeout for the slot mutex.
 */
bool modem_tx_take(modem_topic_t *topic, const char **payload, size_t *len, uint32_t *tx_id);
/**
 * @brief Release the publish slot and report its completion.
 *
 * The result becomes visible before the mutex is released and the ACK is emitted.
 * An empty slot produces no event.
 *
 * @param ok True if the publish succeeds.
 * @param error Modem result or local failure code, zero on success.
 * @note Context: Modem task after claiming a slot. Blocking: Waits without a timeout for the slot mutex,
 *       then invokes the sink after releasing the mutex.
 */
void modem_tx_done(bool ok, int16_t error);

/**
 * @brief Copy an eligible command into the FIFO and notify the app.
 *
 * Disabled command reception or invalid input is ignored. A full FIFO retains its existing commands
 * and increments the overflow count. The app owns payload validation and command deduplication.
 *
 * @param payload Payload bytes borrowed for the copy. NULL is ignored.
 * @param len Length in bytes, from 1 through MODEM_CMD_MAX for admission.
 * @note Context: Modem task. Blocking: Waits without a timeout for the slot mutex, then invokes the sink
 *       after releasing the mutex if the command was stored.
 */
void modem_cmd_store(const char *payload, size_t len);

/**
 * @brief Append as many input bytes as fit in the destination.
 *
 * @param destination Required caller-owned byte buffer.
 * @param capacity Total destination size in bytes.
 * @param used Required byte count in the range zero through @p capacity. Updated by the number copied.
 * @param data Required source buffer of at least @p len bytes, borrowed for the copy.
 * @param len Number of input bytes available.
 * @return Number of bytes copied. The caller decides whether truncation invalidates the frame.
 * @note Context: Modem task in HTTP or MQTT raw dispatch. Blocking: Non-blocking.
 * @warning Source and destination must not overlap.
 */
static inline size_t append_bounded(void *destination, size_t capacity, size_t *used,
                             const uint8_t *data, size_t len)
{
    size_t room = capacity - *used;
    size_t copied = len < room ? len : room;
    memcpy((uint8_t *)destination + *used, data, copied);
    *used += copied;
    return copied;
}

/** @brief Step of the modem task's LTE and MQTT link sequence. */
typedef enum {
    MODEM_LINK_STEP_OFF = 0,     /**< Link work is stopped. */
    MODEM_LINK_STEP_POWER,       /**< Check the restart guard and wake the module if needed. */
    MODEM_LINK_STEP_SYNC,        /**< Synchronize the AT channel and disable command echo. */
    MODEM_LINK_STEP_SIM,         /**< Check whether the SIM is ready. */
    MODEM_LINK_STEP_REG,         /**< Wait for LTE network registration. */
    MODEM_LINK_STEP_PDP,         /**< Open the packet-data context. */
    MODEM_LINK_STEP_MQTT_START,  /**< Start the MQTT service. */
    MODEM_LINK_STEP_MQTT_ACQ,    /**< Allocate the SIM7600 MQTT client. */
    MODEM_LINK_STEP_MQTT_CONN,   /**< Connect the client to the broker. */
    MODEM_LINK_STEP_MQTT_SUB,    /**< Subscribe to the commands topic when enabled. */
    MODEM_LINK_STEP_UP           /**< MQTT setup is complete and publishes may proceed. */
} modem_link_step_t;

/**
 * @brief Read the modem task's current link step.
 *
 * @return The internal sequence step, which is distinct from the public link snapshot.
 * @note Context: Modem task. Blocking: Non-blocking.
 */
modem_link_step_t modem_link_current_step(void);
/**
 * @brief Set the link step and reset its retry clock and attempt count.
 *
 * OFF and POWER also clear the accumulated failure count.
 *
 * @param step New link step.
 * @note Context: Modem task. Blocking: Non-blocking.
 */
void modem_link_reset(modem_link_step_t step);
/**
 * @brief Return to broker connection setup after an MQTT disconnect.
 *
 * At the MQTT connect step or later, publish network-up state and return to the connect step,
 * retaining the LTE packet-data context.
 *
 * @note Context: Modem task during MQTT receive dispatch or publish completion. Blocking: Non-blocking.
 */
void modem_link_on_connection_lost(void);
