/**
 * @file src/services/services.h
 * @brief GNSS, HTTP and LTE link services built on the AT engine.
 *
 * The modem task runs link steps, reconciles GNSS demand and executes OTA byte-source requests.
 * AT dispatch routes HTTP lines and raw chunks. The waiting OTA worker owns the destination buffer.
 * The link service owns retries. The GNSS parsers have no persistent state and also run in host tests.
 * Direct UART access belongs to transport. The app owns fix selection and OTA image policy.
 */
#pragma once
#include "modem_internal.h"
#include "ivts_core/model/gnss.h"

/** @brief LTE and MQTT connection state owned and mutated by the modem task after startup. */
typedef struct {
    modem_link_step_t step;           /**< Current link step. */
    uint32_t    attempt;      /**< Failures counted for the current step. */
    uint32_t    fails_total;  /**< Accumulated failures. The threshold requests a power cycle. */
    uint64_t    retry_at_ms;     /**< Earliest monotonic retry time in milliseconds, or zero for no delay. */
    uint64_t    entered_at_ms;     /**< Monotonic entry time of the current step in milliseconds. */
} modem_link_t;

/**
 * @brief Run one due link step and apply its transition.
 *
 * OFF, UP and a pending retry deadline leave the step idle. A failure can schedule backoff or
 * request a power cycle. Network and broker readiness are reported by link events.
 *
 * @note Context: Modem task loop. Blocking: Runs the selected step's AT commands and can also
 *       wait for a shutdown pulse or a signal-quality query. It does not sleep through retry delays.
 */
void modem_link_tick(void);
/**
 * @brief Initialize the link state to OFF with cleared retry bookkeeping.
 *
 * @note Context: Modem startup before the task runs. Blocking: Non-blocking.
 */
void modem_link_init(void);
/**
 * @brief Attempt the guarded shutdown pulse and clear tracked GNSS power if it runs.
 *
 * @note Context: Modem task during shutdown or recovery. Blocking: A permitted pulse delays for
 *       3000 ms after tick conversion. The restart guard is checked on later calls.
 */
void modem_link_power_down(void);

/** @brief Transition requested by a single link step. */
typedef enum {
    MODEM_LINK_IDLE, /**< Leave the step and retry deadline alone.
     */MODEM_LINK_ADVANCE, /**< Enter the target step with an optional delay.
     */MODEM_LINK_FAIL, /**< Count a failure and apply recovery or backoff.
     */MODEM_LINK_RETRY_LATER, /**< Retry after a delay without counting a failure.
     */MODEM_LINK_RESTART, /**< Count a registration failure and return to POWER with backoff or a shutdown guard.
     */MODEM_LINK_BROKER_UP, /**< Enter UP and report broker readiness. */
} step_action_t;

/** @brief By-value result from a link step, consumed by the modem task. */
typedef struct {
    step_action_t action;       /**< Transition or scheduling action to apply. */
    modem_link_step_t target;   /**< Destination for MODEM_LINK_ADVANCE. */
    uint32_t delay_ms;          /**< Delay before the next step in milliseconds for advance or retry. */
} step_result_t;

/**
 * @brief Execute link work for the current step and return the requested transition.
 *
 * The step may perform I/O or emit network-up. The tick function applies the returned action.
 *
 * @param link Required link state borrowed for the call.
 * @return The action, optional target and delay. Unhandled steps return MODEM_LINK_IDLE.
 * @note Context: Modem task. Blocking: Step-specific AT waits. Packet-data setup uses a 5 s
 *       configuration deadline and a 150 s activation deadline. Power-on can delay for a 500 ms pulse.
 */
step_result_t modem_link_run_step(const modem_link_t *link);

/**
 * @brief Initialize GNSS demand, tracked power and the next fix time.
 *
 * @note Context: Modem startup before the task runs. Blocking: Non-blocking.
 */
void modem_gnss_init(void);
/**
 * @brief Record the requested GNSS power for the next eligible task step.
 *
 * @param enabled True requests GNSS power on. False requests power off.
 * @note Context: Modem task while draining requests. Blocking: Non-blocking.
 */
void modem_gnss_request(bool enabled);
/**
 * @brief Clear the tracked GNSS power state after a modem shutdown pulse.
 *
 * The requested state survives for reconciliation when link startup permits GNSS work again.
 *
 * @note Context: Modem task. Blocking: Non-blocking.
 */
void modem_gnss_reset_power(void);
/**
 * @brief Reconcile GNSS power or take one due fix sample.
 *
 * When a power command fails, query actual GNSS state. When the full fix command or parser fails,
 * try the fallback report. A parsed no-fix report is still an event and does not trigger fallback.
 *
 * @note Context: Modem task at the SIM step or later. Blocking: Uses up to 7 s of nominal AT deadlines for
 *       a power change and state query, or up to 4 s for a full report and fallback.
 */
void modem_gnss_step(void);

/* The parsers below decode SIM7600 reports without I/O. The manual describes the full and fallback
 * report formats in sections 17.2.2 and 17.2.21 of the SIM7500_SIM7600 Series AT Command Manual V2.00. */

/**
 * @brief Decode a full SIM7600 GNSS report with satellite counts.
 *
 * The parser locates the coordinates by hemisphere fields and saturates the satellite count at 255.
 * An empty leading field yields a no-fix sample. Malformed optional time, speed and course values stay zero.
 *
 * @param line Required NUL-terminated +CGNSSINFO response borrowed for the call.
 * @param[out] out Required caller-owned fix. The parser can clear or partially write it before failing.
 * @retval IVTS_OK A fix or a no-fix report is decoded with source IVTS_GNSS_SRC_FULL.
 * @retval IVTS_ERR_INVALID_ARG A pointer is NULL, the prefix or input length is invalid,
 *         or the required position fields are missing or malformed.
 * @note Context: Modem task or host caller. Blocking: Non-blocking.
 */
ivts_err_t gnss_parse_cgnssinfo(const char *line, ivts_gnss_t *out);

/**
 * @brief Decode a fallback SIM7600 GNSS report.
 *
 * The fallback leaves satellite count zero. An empty leading field yields a no-fix sample.
 * Malformed optional time, speed and course values stay zero.
 *
 * @param line Required NUL-terminated +CGPSINFO response borrowed for the call.
 * @param[out] out Required caller-owned fix. The parser can clear or partially write it before failing.
 * @retval IVTS_OK A fix or a no-fix report is decoded with source IVTS_GNSS_SRC_APPROX.
 * @retval IVTS_ERR_INVALID_ARG A pointer is NULL, the prefix or input length is invalid,
 *         or the required position fields are missing or malformed.
 * @note Context: Modem task or host caller. Blocking: Non-blocking.
 */
ivts_err_t gnss_parse_cgpsinfo(const char *line, ivts_gnss_t *out);

/**
 * @brief Convert NMEA degrees and minutes to signed degrees times 10^7.
 *
 * For example, "3113.330650" with 'N' gives 312221775. South and west are negative.
 *
 * @param ddmm Required NUL-terminated degrees and decimal minutes, borrowed for the call.
 * @param hemi 'N' or 'S' selects latitude. 'E' or 'W' selects longitude.
 * @param[out] out Required caller-owned scaled coordinate, untouched on failure.
 * @retval IVTS_OK The coordinate converts within the hemisphere's range.
 * @retval IVTS_ERR_INVALID_ARG A required pointer is NULL, the number or hemisphere is invalid,
 *         minutes reach 60, or the converted coordinate exceeds its range.
 * @note Context: Modem task or host caller. Blocking: Non-blocking.
 */
ivts_err_t gnss_nmea_to_e7(const char *ddmm, char hemi, int32_t *out);

/**
 * @brief Convert the GNSS date and UTC time to Unix milliseconds.
 *
 * @param ddmmyy Required six-digit date string. The year ranges from 2000 through 2099.
 * @param hhmmss Required time string starting with six digits. Up to three fractional digits
 *               following a decimal point contribute milliseconds. Both strings are borrowed.
 * @param[out] out Required caller-owned Unix milliseconds, untouched on failure.
 * @retval IVTS_OK The calendar date and time convert.
 * @retval IVTS_ERR_INVALID_ARG A required pointer is NULL, a required digit is missing,
 *         the date length is invalid or a calendar field is out of range.
 * @note Context: Modem task or host caller. Blocking: Non-blocking.
 */
ivts_err_t gnss_datetime_to_unix_ms(const char *ddmmyy, const char *hhmmss, uint64_t *out);

/**
 * @brief Execute an HTTP operation for the waiting OTA worker.
 *
 * @param request Required queued open, read or close request. Borrowed buffers remain available through completion.
 * @retval IVTS_OK A GET or read succeeds, or close is attempted.
 * @retval IVTS_ERR_INVALID_ARG The operation or open URL is invalid.
 * @retval IVTS_ERR_INVALID_STATE An open request arrives before the packet-data step.
 * @retval IVTS_ERR_TIMEOUT The GET action ends without a successful AT result.
 * @retval IVTS_ERR_IO Required setup fails, a response is malformed or unsuccessful, or reading fails.
 * @note Context: Modem task while handling a queued request. Blocking: Uses per-command AT deadlines,
 *       including 120 s for the GET action, 15 s for a read or 5 s for close.
 */
ivts_err_t modem_http_handle(const modem_req_t *request);
/**
 * @brief Recognize a positive-length HTTP read header and arm raw framing.
 *
 * Both the numeric and DATA-prefixed length forms are accepted during a read.
 * Oversize blocks are still consumed so the parser can return to line mode.
 *
 * @param line Required NUL-terminated line borrowed for the call.
 * @retval true An active read claims a matching header.
 * @retval false No active destination or no valid matching header.
 * @note Context: Modem task in AT dispatch. Blocking: Non-blocking.
 */
bool modem_http_on_line(const char *line);
/**
 * @brief Route one raw chunk to the active HTTP block.
 *
 * Copy only the bytes that fit in the borrowed read buffer when it is still present.
 *
 * @param data Required chunk borrowed for the call.
 * @param len Number of bytes in the chunk.
 * @param is_last True for the end of the announced raw block.
 * @retval true HTTP owns the raw block and claims the chunk.
 * @retval false HTTP is outside raw mode and leaves the chunk for MQTT.
 * @note Context: Modem task in AT dispatch. Blocking: Non-blocking.
 */
bool modem_http_route_raw(const uint8_t *data, size_t len, bool is_last);
/**
 * @brief Leave HTTP raw mode and mark any interrupted HTTP block as failed.
 *
 * @note Context: Modem task during AT dispatch recovery. Blocking: Non-blocking.
 */
void modem_http_discard_raw(void);
