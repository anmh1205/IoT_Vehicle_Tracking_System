/**
 * @file include/modem/modem.h
 * @brief Public SIM7600 LTE, MQTT, GNSS and HTTPS APIs.
 *
 * The modem task owns all UART communication. The app posts control requests without waiting for
 * queue space and exchanges MQTT payloads through mutex-protected copies. The OTA worker serializes
 * HTTPS calls and retains its buffers until the modem task signals completion.
 * The event sink copies event values during the callback. The app handles commands.
 * The OTA component validates and writes firmware images.
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

/**
 * @brief Caller-owned configuration copied by modem_init() and read by the modem task.
 *
 * The caller may reuse the source object after initialization. Callback targets and the sink context
 * stay valid for the modem task lifetime.
 */
typedef struct {
    ivts_sink_t sink;                /**< Required sink for link, MQTT ACK, command and GNSS events. */
    bool     (*time_get)(uint64_t *unix_ms);  /**< Optional modem-task callback that writes Unix ms on success. */
    int      uart_num;               /**< ESP32-S3 UART number wired to the SIM7600. */
    int      pin_tx, pin_rx;         /**< ESP32-S3 UART transmit and receive GPIO numbers, respectively. */
    int      pin_pwrkey;             /**< GPIO wired to the module's PWRKEY control. */
    int      pin_reset;              /**< GPIO wired to RESET. The driver leaves it unused. */
    bool     pwrkey_inverted;        /**< True if the PCB inverts PWRKEY, so a high GPIO level asserts the signal. */
    uint32_t baud;                   /**< UART baud rate in bits per second. */
    char     apn[64];                /**< NUL-terminated cellular carrier APN. */
    char     mqtt_host[64];          /**< NUL-terminated MQTT broker host. */
    uint16_t mqtt_port;              /**< Broker TCP port for plaintext MQTT. TLS uses port 8883. */
    bool     use_tls;                /**< Client TLS policy, supplied by app wiring. */
    bool     command_subscribe_enabled;  /**< Enable subscription and admission of commands to the FIFO. */
    char     client_id[MODEM_CLIENT_ID_MAX + 1u];  /**< NUL-terminated MQTT client ID of 1 to 23 bytes. */
    char     mqtt_user[32];          /**< NUL-terminated MQTT username. Empty omits credentials from the command. */
    char     mqtt_pass[64];          /**< NUL-terminated MQTT password used with a nonempty username. */
    char     device_id[32];          /**< NUL-terminated device identifier for v1/<device_id>/ topic names. */
    uint16_t gnss_period_s;          /**< GNSS polling interval in seconds. Zero makes each eligible loop due. */
    uint8_t  task_prio;              /**< FreeRTOS priority for the modem task. */
    uint32_t task_stack;             /**< Modem task stack size in bytes. */
} modem_cfg_t;

/**
 * @brief Initialize UART, PWRKEY, shared slots and the modem task.
 *
 * The worker starts in the logical off state and waits for modem_set_link(true) to begin the link sequence.
 *
 * @param cfg Required configuration copied into modem-owned storage.
 * @retval IVTS_OK The modem task starts.
 * @retval IVTS_ERR_INVALID_ARG The configuration or sink callback is missing, or the client ID length is invalid.
 * @retval IVTS_ERR_FULL A topic exceeds its buffer, slot allocation fails or hardware or task startup fails.
 * @note Context: App startup before other callers use the modem. Blocking: Performs SDK driver setup and
 *       allocation synchronously without waiting for the link.
 * @warning Use once per boot. Startup failure can leave resources allocated.
 */
ivts_err_t modem_init(const modem_cfg_t *cfg);

/** @name Nonblocking control requests
 * @{
 */

/**
 * @brief Request a powered modem connection or orderly shutdown.
 *
 * A true request progresses through power, LTE and MQTT setup, including subscription when enabled.
 * A false request runs the disconnect and shutdown path. Link transitions use IVTS_EV_LINK_STATE.
 * An accepted start keeps the stopped snapshot false while queued. A rejected start leaves no pending request.
 *
 * @param on True requests link startup. False requests shutdown.
 * @retval IVTS_OK The queue accepts the request.
 * @retval IVTS_ERR_FULL The queue has no free entry.
 * @retval IVTS_ERR_INVALID_STATE The request queue is absent.
 * @note Context: App startup or app task. Blocking: Non-blocking queue send.
 */
ivts_err_t modem_set_link(bool on);
/**
 * @brief Read whether the modem is stopped and no start is pending.
 *
 * After link-down, stopped means the logical link is off and the power-down pulse has been issued.
 * The SIM7600 may still be completing shutdown for about 26 s (Hardware Design Table 9).
 * modem_power_restart_is_blocked() defers restart during that window.
 *
 * @retval true The task is initially off or has completed the logical link-down path, with no start pending.
 * @retval false A start is pending or link processing is active.
 * @note Context: App task. Blocking: Non-blocking atomic reads.
 */
bool modem_is_stopped(void);
/**
 * @brief Read the latest reported link state even if its notification drops.
 *
 * @return The current link snapshot, initially IVTS_LINK_DOWN.
 * @note Context: App task. Blocking: Non-blocking atomic read.
 */
ivts_link_t modem_link_state(void);

/**
 * @brief Request GNSS power and receive samples through IVTS_EV_GNSS_FIX.
 *
 * The modem task records the demand and applies it when the link reaches the SIM step or later.
 *
 * @param on True requests GNSS on. False requests GNSS off.
 * @retval IVTS_OK The queue accepts the request.
 * @retval IVTS_ERR_FULL The queue has no free entry.
 * @retval IVTS_ERR_INVALID_STATE The request queue is absent.
 * @note Context: App task. Blocking: Non-blocking queue send.
 */
ivts_err_t modem_set_gnss(bool on);
/** @} */

/** @brief Identify a publish topic under v1/<device_id>/. */
typedef enum {
    MODEM_TOPIC_RAWDATA = 0,  /**< Raw telemetry on rawdata. */
    MODEM_TOPIC_STATUS,       /**< Device status on status. */
    MODEM_TOPIC_EVENTS,       /**< Device events on events. */
    MODEM_TOPIC_FIRMWARE,     /**< Firmware update reports on firmware. */
    MODEM_TOPIC_CMD_ACK,      /**< Application command acknowledgements on commands/ack. */
    MODEM_TOPIC_COUNT        /**< Number of publish topics and exclusive upper bound for topic IDs. */
} modem_topic_t;

/**
 * @brief Copy one outbound message into the QoS 1 publish slot.
 *
 * Acceptance invalidates the previous result. The modem task reports completion through IVTS_EV_MQTT_ACK.
 * If it services the slot without a broker session, it completes the slot with a failed result.
 *
 * @param topic Publish topic from MODEM_TOPIC_RAWDATA through MODEM_TOPIC_CMD_ACK.
 * @param payload Required buffer of at least @p len bytes. The modem copies the bytes before returning.
 * @param len Payload length in bytes, from 1 through MODEM_PAYLOAD_MAX.
 * @param tx_id Caller-selected transaction ID echoed in the result and ACK event.
 * @retval IVTS_OK The slot accepts the message.
 * @retval IVTS_ERR_FULL An earlier publish still owns the slot.
 * @retval IVTS_ERR_INVALID_ARG The topic is out of range, the length is invalid or the payload is NULL.
 * @note Context: App task after successful initialization. Blocking: Waits without a timeout for the slot mutex.
 */
ivts_err_t modem_publish(modem_topic_t topic, const char *payload, size_t len, uint32_t tx_id);

/**
 * @brief Check whether the outbound slot holds a queued or in-flight publish.
 *
 * @retval true A message occupies the slot.
 * @retval false The slot can accept a publish.
 * @note Context: Task context after initialization. Blocking: Waits without a timeout for the slot mutex.
 */
bool modem_publish_busy(void);
/**
 * @brief Look up the most recent publish result by transaction ID.
 *
 * Reading leaves the result available until the next accepted publish. The app uses this if its ACK event drops.
 * The error is zero on success, -1 for a missing broker session or a publish timeout,
 * -2 for an input failure or unparsed publish error, or the parsed modem error.
 *
 * @param tx_id Transaction ID passed to modem_publish().
 * @param[out] ok Required outcome flag, written only for a matching result.
 * @param[out] err Required modem or local error code, written only for a matching result.
 * @retval true A matching completed publish exists and both outputs are written.
 * @retval false No matching result exists and both outputs are untouched.
 * @note Context: App task after successful initialization. Blocking: Waits without a timeout for the slot mutex.
 */
bool modem_publish_result(uint32_t tx_id, bool *ok, int16_t *err);

/**
 * @brief Copy and release the oldest cloud command from the modem FIFO.
 *
 * The app can drain commands after IVTS_EV_CMD_PENDING. Use the returned byte length to read the payload.
 *
 * @param[out] out Required caller-owned buffer. A successful copy adds no trailing NUL.
 * @param cap Capacity of @p out in bytes. MODEM_CMD_MAX accepts any queued payload.
 * @param[out] len Required byte count output. Both outputs remain untouched on failure.
 * @retval IVTS_OK The oldest command is copied and removed.
 * @retval IVTS_ERR_NOT_FOUND The FIFO is empty.
 * @retval IVTS_ERR_FULL The buffer is too small and the command remains queued.
 * @retval IVTS_ERR_INVALID_ARG A required output pointer is NULL.
 * @note Context: App task after successful initialization. Blocking: Waits without a timeout for the slot mutex.
 */
ivts_err_t modem_cmd_take(char *out, size_t cap, size_t *len);

/**
 * @brief Read the count of new commands dropped by a full FIFO.
 *
 * @return The boot-lifetime overflow counter, modulo 2^32.
 * @note Context: App task after successful initialization. Blocking: Waits without a timeout for the slot mutex.
 */
uint32_t modem_cmd_dropped(void);

/** @name Blocking HTTPS byte source for OTA
 * @{
 */

/**
 * @brief Open an HTTPS GET and return its reported status and size.
 *
 * The modem checks the link step, attempts to close a stale HTTP session and accepts HTTP 200 as success.
 *
 * @param url Required NUL-terminated HTTPS URL borrowed through completion. Spaces, quotes, backslashes,
 *            tabs and line breaks are rejected. The URL command must fit the modem command buffer.
 * @param[out] size Required content length in bytes. The modem writes the parsed length even for a non-200 status.
 * @param[out] http_status Required parsed HTTP status. Both outputs start at zero after the pointer checks.
 * @retval IVTS_OK The modem reports HTTP 200 and a nonnegative length.
 * @retval IVTS_ERR_INVALID_ARG A required pointer is NULL, the URL is invalid or the URL command exceeds capacity.
 * @retval IVTS_ERR_INVALID_STATE The modem link step is earlier than packet-data setup.
 * @retval IVTS_ERR_FULL Reply allocation or queue submission fails.
 * @retval IVTS_ERR_TIMEOUT The HTTP action ends without a successful AT result.
 * @retval IVTS_ERR_IO Required setup fails, the reply is malformed or the status differs from 200.
 * @note Context: OTA worker. Blocking: Queue space for up to 1000 ms after tick conversion, then waits without
 *       a caller timeout for completion. Setup and GET use up to 178 s of nominal AT deadlines,
 *       including 120 s for the GET action. The clock callback can add time.
 */
ivts_err_t modem_http_open(const char *url, uint32_t *size, int *http_status);

/**
 * @brief Read up to @p len bytes at @p offset from the active HTTP source.
 *
 * @param offset Zero-based byte offset in the response body.
 * @param[out] buf Required caller-owned buffer of at least @p len bytes, borrowed through completion.
 *                 The modem can write a prefix before reporting an error.
 * @param len Positive requested byte count and capacity of @p buf.
 * @param[out] got Required byte count. It starts at zero after argument validation and is positive on success.
 * @retval IVTS_OK The modem completes the read with one or more bytes within capacity.
 * @retval IVTS_ERR_INVALID_ARG The buffer or count pointer is NULL, or @p len is zero.
 * @retval IVTS_ERR_FULL Reply allocation or queue submission fails.
 * @retval IVTS_ERR_IO AT completion fails, the raw frame times out, the reply exceeds capacity or no bytes arrive.
 * @note Context: OTA worker after a successful open. Blocking: Queue space for up to 1000 ms after tick conversion,
 *       then waits without a caller timeout. The modem uses a 15 s read-command deadline.
 */
ivts_err_t modem_http_read(uint32_t offset, uint8_t *buf, size_t len, size_t *got);

/**
 * @brief Attempt to close the active HTTP session on the modem.
 *
 * The function discards queue and modem errors.
 *
 * @note Context: OTA worker. Blocking: Queue space for up to 1000 ms after tick conversion, then waits without
 *       a caller timeout if queued. The modem uses a 5 s close-command deadline.
 */
void modem_http_close(void);
/** @} */
