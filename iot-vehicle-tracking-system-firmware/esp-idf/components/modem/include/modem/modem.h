/**
 * @file modem.h
 * @brief Public SIM7600 LTE, MQTT, GNSS and HTTPS APIs.
 *
 * The modem task owns all communication with the module. Control requests are
 * queued without waiting. The HTTPS byte-source calls wait for the modem task
 * to finish. Asynchronous results are delivered by value through the sink.
 */
#pragma once

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/event/event.h"

#define MODEM_CLIENT_ID_MAX 23u      /**< MQTT client ID limit in bytes. AT+CMQTTACCQ accepts 1 through 23 bytes. */
#define MODEM_CMD_MAX       1024u    /**< Maximum inbound cloud command payload in bytes. */
#define MODEM_PAYLOAD_MAX   2048u    /**< Maximum outbound MQTT payload in bytes. */

/** Configuration copied by modem_init(). The source object may be reused after the call. */
typedef struct {
    ivts_sink_t sink;                /**< Sink for link, MQTT ACK, command and GNSS events. */
    bool     (*time_get)(uint64_t *unix_ms);  /**< Optional trusted UTC source called on the modem task. */
    int      uart_num;               /**< ESP32-S3 UART number wired to the SIM7600. */
    int      pin_tx, pin_rx;         /**< ESP32-S3 UART transmit and receive pins. */
    int      pin_pwrkey;             /**< GPIO wired to the module's PWRKEY control. */
    int      pin_reset;              /**< GPIO wired to RESET, reserved for future use. */
    bool     pwrkey_inverted;        /**< True if the PCB inverts PWRKEY, so a high GPIO level asserts the signal. */
    uint32_t baud;                   /**< UART baud rate. */
    char     apn[64];                /**< Cellular carrier APN. */
    char     mqtt_host[64];          /**< MQTT broker host. */
    uint16_t mqtt_port;              /**< MQTT broker port. */
    bool     use_tls;                /**< Client TLS policy, supplied by app wiring. */
    bool     command_subscribe_enabled;
    char     client_id[MODEM_CLIENT_ID_MAX + 1u];  /**< MQTT client identifier, from 1 through MODEM_CLIENT_ID_MAX bytes. */
    char     mqtt_user[32];          /**< MQTT username. */
    char     mqtt_pass[64];          /**< MQTT password. */
    char     device_id[32];          /**< Device identifier used to form v1/<device_id>/ topic names. */
    uint16_t gnss_period_s;          /**< GNSS polling interval in seconds. */
    uint8_t  task_prio;              /**< FreeRTOS priority for the modem task. */
    uint32_t task_stack;             /**< Modem task stack size in bytes. */
} modem_cfg_t;

/**
 * @brief Initialize UART, PWRKEY, shared slots and the modem task.
 *
 * The task starts with the module powered off. Post modem_set_link(true) to
 * start the connection state machine.
 *
 * @return IVTS_OK after startup, IVTS_ERR_INVALID_ARG for invalid
 * configuration, or the applicable topic, allocation or hardware error.
 */
ivts_err_t modem_init(const modem_cfg_t *cfg);

/**
 * @name Nonblocking control requests These functions post work on the modem
 * task. Returns include IVTS_ERR_FULL for a full request queue and
 * IVTS_ERR_INVALID_STATE before initialization.
 * @{
 */

/**
 * @brief Request a powered modem connection or orderly shutdown.
 *
 * A true request powers the modem, registers LTE, opens the PDP context,
 * connects MQTT and subscribes when enabled. A false request disconnects and
 * pulses PWRKEY to shut down. Progress is reported through IVTS_EV_LINK_STATE.
 */
ivts_err_t modem_set_link(bool on);
/** @return True before starting the link or after the shutdown pulse completes. */
bool modem_is_stopped(void);
/** Read the latest link state even if its queued notification was dropped. */
ivts_link_t modem_link_state(void);

/** @brief Request GNSS power and receive fixes through IVTS_EV_GNSS_FIX. */
ivts_err_t modem_set_gnss(bool on);
/** @} */

/** Publish topic identifier for a name under v1/<device_id>/. */
typedef enum {
    MODEM_TOPIC_RAWDATA = 0,
    MODEM_TOPIC_STATUS,
    MODEM_TOPIC_EVENTS,
    MODEM_TOPIC_FIRMWARE,
    MODEM_TOPIC_CMD_ACK,
    MODEM_TOPIC_COUNT
} modem_topic_t;

/**
 * @brief Copy one outbound message into the QoS 1 publish slot.
 *
 * The caller can reuse its payload after this function returns. Completion is
 * reported through IVTS_EV_MQTT_ACK with the supplied transaction ID. The
 * modem task reports a failed ACK immediately when the broker is unavailable.
 *
 * @param tx_id Caller-selected transaction ID echoed in the ACK event.
 * @retval IVTS_OK The slot accepted the message.
 * @retval IVTS_ERR_FULL An earlier publish still owns the slot.
 * @retval IVTS_ERR_INVALID_ARG Invalid topic, length or payload pointer.
 */
ivts_err_t modem_publish(modem_topic_t topic, const char *payload, size_t len, uint32_t tx_id);

/** @return True while the publish slot is waiting for its result. */
bool modem_publish_busy(void);
/** Look up the most recent result by transaction ID if the app queue dropped its ACK. */
bool modem_publish_result(uint32_t tx_id, bool *ok, int16_t *err);

/**
 * @brief Copy and release the oldest cloud command from the modem FIFO.
 *
 * The app can drain commands after IVTS_EV_CMD_PENDING. The payload has no
 * trailing NUL. Use the byte length returned through @p len.
 *
 * @param cap Capacity of @p out. Use MODEM_CMD_MAX to accept any queued
 * payload.
 * @retval IVTS_OK The oldest command was copied and removed.
 * @retval IVTS_ERR_NOT_FOUND The FIFO is empty.
 * @retval IVTS_ERR_FULL The buffer is too small and the command remains
 * queued.
 */
ivts_err_t modem_cmd_take(char *out, size_t cap, size_t *len);

/**
 * @return Number of new commands dropped by a full FIFO since boot.
 *
 * The modem has already sent broker PUBACK for these. The cloud retries using
 * the command ID if the application-level acknowledgement is absent.
 */
uint32_t modem_cmd_dropped(void);

/**
 * @name Blocking HTTPS byte source for OTA The OTA worker waits until the
 * modem task finishes accessing its buffers.
 * @{
 */

/**
 * @brief Open an HTTPS GET and return its reported status and size.
 * @param[out] size Content length reported by the modem.
 * @param[out] http_status HTTP status code reported by the modem.
 */
ivts_err_t modem_http_open(const char *url, uint32_t *size, int *http_status);

/**
 * @brief Read up to @p len bytes at @p offset into @p buf.
 * @param[out] got Number of bytes copied by the modem task.
 */
ivts_err_t modem_http_read(uint32_t offset, uint8_t *buf, size_t len, size_t *got);

/** @brief Close the active HTTP session on the modem. */
void modem_http_close(void);
/** @} */
