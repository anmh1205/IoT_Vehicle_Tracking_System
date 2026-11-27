/**
 * @file modem_internal.h
 * @brief Private modem task, slot and link interfaces.
 *
 * The modem task owns UART protocol state. Cross-task storage is either copied
 * under a mutex or borrowed for the lifetime of a synchronous request.
 */
#pragma once
#include "modem/modem.h"
#include "esp_err.h"
#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include <stdbool.h>
#include "ivts_core/base/err.h"

/* UART log tags (see platform/log.h). Per-command AT traffic uses its own tag so it can be enabled alone. */
#define MODEM_TAG "modem"
#define AT_TAG    "at"

/* Configuration and topics are initialized before starting the modem task. */
const modem_cfg_t *modem_config(void);
const char *modem_topic_name(modem_topic_t topic);
const char *modem_command_topic(void);
uint64_t modem_now(void);
void modem_emit(const ivts_event_t *event);
void modem_emit_link(uint8_t link, int32_t error);
void modem_set_stopped(bool stopped);

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
 * Notifications sent through component sinks carry values with no borrowed
 * buffers because their receivers run independently.
 */
typedef struct {
    uint8_t           op;       /**< modem_req_op_t. */
    bool              on;       /**< Requested state for REQ_LINK and REQ_GNSS. */
    const char       *url;      /**< REQ_HTTP_OPEN URL. The waiting caller owns the buffer. */
    uint8_t          *buf;      /**< REQ_HTTP_READ destination buffer. */
    size_t            len;      /**< REQ_HTTP_READ destination capacity in bytes. */
    uint32_t          offset;   /**< REQ_HTTP_READ offset in the content, in bytes. */
    size_t           *got;      /**< REQ_HTTP_READ byte count actually copied. */
    uint32_t         *size;     /**< REQ_HTTP_OPEN content size in bytes. */
    int              *status;   /**< REQ_HTTP_OPEN HTTP status code. */
    struct modem_rpc *reply;    /**< Completion state owned by the waiting task. */
} modem_req_t;

/* Initialize I/O and create the only consumer of the request queue. */
esp_err_t modem_task_start(const modem_cfg_t *cfg);
/* Copy a request into the task queue. HTTP callers may wait for space. */
ivts_err_t modem_task_post(const modem_req_t *request, uint32_t timeout_ms);

/** @brief Submit an HTTP request and block until the modem releases its buffers. */
ivts_err_t modem_task_call(modem_req_t *request);

/* One mutex protects publication and command FIFO copies. */
bool modem_slots_init(void);

/* Modem task takes the publish slot and releases it after broker confirmation or an error. */
bool modem_tx_take(modem_topic_t *topic, const char **payload, size_t *len, uint32_t *tx_id);
void modem_tx_done(bool ok, int16_t error);

/* Modem task. Store a validated command then signal the app queue. */
void modem_cmd_store(const char *payload, size_t len);

/* Copy the available prefix and return its size. Caller decides whether truncation is allowed. */
static inline size_t append_bounded(void *destination, size_t capacity, size_t *used,
                             const uint8_t *data, size_t len)
{
    size_t room = capacity - *used;
    size_t copied = len < room ? len : room;
    memcpy((uint8_t *)destination + *used, data, copied);
    *used += copied;
    return copied;
}

typedef enum {
    MODEM_LINK_STEP_OFF = 0,     /**< Module powered off. */
    MODEM_LINK_STEP_POWER,       /**< Power the module on through PWRKEY. */
    MODEM_LINK_STEP_SYNC,        /**< Synchronize the AT channel with the modem. */
    MODEM_LINK_STEP_SIM,         /**< Check whether the SIM is ready. */
    MODEM_LINK_STEP_REG,         /**< Wait for LTE network registration. */
    MODEM_LINK_STEP_PDP,         /**< Open the packet-data context. */
    MODEM_LINK_STEP_MQTT_START,  /**< Start the MQTT service. */
    MODEM_LINK_STEP_MQTT_ACQ,    /**< Allocate the SIM7600 MQTT client. */
    MODEM_LINK_STEP_MQTT_CONN,   /**< Connect the client to the broker. */
    MODEM_LINK_STEP_MQTT_SUB,    /**< Subscribe topic command. */
    MODEM_LINK_STEP_UP           /**< Broker session ready to send and receive. */
} modem_link_step_t;

modem_link_step_t modem_link_current_step(void);
void modem_link_reset(modem_link_step_t step);
void modem_link_on_connection_lost(void);
