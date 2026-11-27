/**
 * @file src/mqtt/mqtt.h
 * @brief Private MQTT session, TLS, receive and QoS 1 publish interfaces.
 *
 * The link service drives broker setup and recovery on the modem task. The task loop publishes
 * from the shared slot, and AT dispatch feeds inbound lines and raw chunks to the frame assembler.
 * MQTT hands complete command payloads to the copy FIFO. Authorization and command execution belong to the app.
 * HTTPS reuses TLS setup with its own SIM7600 context index. UART framing belongs to AT dispatch.
 */
#pragma once
#include "modem_internal.h"
#include "modem/modem.h"
#include <stddef.h>
#include <stdint.h>
#include <stdbool.h>

/**
 * @brief Execute one broker setup step.
 *
 * A failed service start attempts to disconnect, release and stop stale modem MQTT state.
 * The link service decides when to retry.
 *
 * @param step One of the MQTT_START, MQTT_ACQ, MQTT_CONN or MQTT_SUB link steps.
 * @retval true The step succeeds or command subscription is disabled at the subscription step.
 * @retval false The step fails or the step is outside MQTT setup.
 * @note Context: Modem task. Blocking: Per-command AT waits. The connect result has a 35 s deadline.
 *       Start and cleanup use up to 25 s of nominal AT deadlines. Client acquisition can use up to
 *       31 s of nominal AT deadlines with TLS, plus any clock callback wait. Subscription uses 15 s when enabled.
 */
bool modem_mqtt_step(modem_link_step_t step);
/**
 * @brief Attempt to disconnect the broker client.
 *
 * The function only sends a disconnect once the link is at the MQTT connect step or later.
 * The AT result is discarded.
 *
 * @note Context: Modem task during link shutdown. Blocking: Uses a 5 s AT deadline when it sends the command.
 */
void modem_mqtt_disconnect(void);
/**
 * @brief Format the MQTT connect command in a caller buffer.
 *
 * Select port 8883 for TLS and the configured port otherwise. A nonempty username adds both credentials.
 *
 * @param[out] out Caller-owned command buffer of @p cap bytes. A failed formatting attempt may alter it.
 * @param cap Buffer capacity in bytes, including the trailing NUL.
 * @param cfg Required configuration with NUL-terminated host and credential fields, borrowed for the call.
 * @param tls Select the TLS port when true.
 * @retval true A complete command fits in the buffer.
 * @retval false Formatting fails or the command does not fit.
 * @note Context: Modem task or host caller. Blocking: Non-blocking string formatting.
 * @warning The output can contain credentials.
 */
bool modem_mqtt_format_connect_cmd(char *out, size_t cap, const modem_cfg_t *cfg, bool tls);

/**
 * @brief Send the pending slot at QoS 1 and record its completion.
 *
 * The modem task borrows the occupied slot through the publish attempt. The ACK event carries zero on success,
 * -2 for topic or payload input failure or an unparsed modem error, -1 on publish timeout, or the modem
 * error code when parsed. A publish timeout returns the link to MQTT service setup.
 *
 * @note Context: Modem task with a broker session. Blocking: Waits for the slot mutex and, if occupied,
 *       uses 10 s AT deadlines for topic and payload input and 65 s for the publish result.
 */
void modem_mqtt_publish_pending(void);

/**
 * @brief Clear the inbound MQTT frame and pending split-header state.
 *
 * @note Context: Modem startup before the task runs, or modem task during receive. Blocking: Non-blocking.
 */
void modem_mqtt_rx_init(void);
/**
 * @brief Handle a modem line that the AT engine and HTTP handler leave unclaimed.
 *
 * Receive headers can carry their fields on the next line. A positive data length arms raw framing
 * even for a rejected frame. An end header can copy the complete command to the FIFO.
 *
 * @param line Required NUL-terminated line borrowed for the call.
 * @note Context: Modem task in AT dispatch. Blocking: Can wait for the slot mutex when delivering a command.
 */
void modem_mqtt_rx_on_urc(const char *line);
/**
 * @brief Copy a raw chunk into the active topic or payload.
 *
 * If the frame exceeds capacity, retain the fitting bytes and mark the frame for rejection.
 *
 * @param data Required raw bytes borrowed for the call.
 * @param len Number of bytes at @p data.
 * @note Context: Modem task in AT dispatch. Blocking: Non-blocking.
 */
void modem_mqtt_rx_on_data(const uint8_t *data, size_t len);
/**
 * @brief Invalidate the incomplete MQTT frame after UART dispatch loses raw data.
 *
 * @note Context: Modem task in AT dispatch. Blocking: Non-blocking.
 */
void modem_mqtt_rx_discard_raw(void);

/**
 * @brief Configure certificate validation on a SIM7600 TLS context.
 *
 * Attempt to set the modem clock when trusted UTC is available. Clock-set failure does not stop TLS setup.
 * The CA certificate filename comes from firmware configuration and must be present on the modem.
 *
 * @param index SIM7600 TLS context index. MQTT uses 0 and HTTPS uses 1.
 * @retval true The SSL settings and CA filename are accepted.
 * @retval false A setting fails or the CA filename is missing, invalid, too long or rejected.
 * @note Context: Modem task. Blocking: Can wait for the clock callback, then uses up to 20 s of nominal
 *       AT deadlines for clock, SSL settings and certificate commands.
 */
bool modem_tls_configure(unsigned index);
