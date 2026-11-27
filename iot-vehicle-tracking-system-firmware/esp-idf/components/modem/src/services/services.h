/**
 * @file services.h
 * @brief GNSS, HTTP and LTE link services built on the AT engine.
 *
 * The modem task runs these services, and AT dispatch routes HTTP replies.
 * Direct UART access belongs in transport/.
 */
#pragma once
#include "modem_internal.h"
#include "ivts_core/model/gnss.h"

/** LTE and MQTT connection state on the modem task. */
typedef struct {
    modem_link_step_t step;           /**< Current link step. */
    uint32_t    attempt;      /**< Consecutive failures of the current step. */
    uint32_t    fails_total;  /**< Failures since power-up. A threshold breach requests a power cycle. */
    uint64_t    retry_at_ms;     /**< Earliest monotonic retry time in milliseconds. */
    uint64_t    entered_at_ms;     /**< Monotonic entry time of the current step in milliseconds. */
} modem_link_t;

/* Modem task. Run the link state machine and publish link transitions. */
void modem_link_tick(void);
void modem_link_init(void);
void modem_link_power_down(void);

typedef enum {
    MODEM_LINK_IDLE, MODEM_LINK_ADVANCE, MODEM_LINK_FAIL, MODEM_LINK_RETRY_LATER, MODEM_LINK_RESTART, MODEM_LINK_BROKER_UP,
} step_action_t;

typedef struct {
    step_action_t action;
    modem_link_step_t target;
    uint32_t delay_ms;
} step_result_t;

step_result_t modem_link_run_step(const modem_link_t *link);

/* Modem task. Reconcile requested GNSS power and publish fixes when due. */
void modem_gnss_init(void);
void modem_gnss_request(bool enabled);
void modem_gnss_reset_power(void);
void modem_gnss_step(void);

/**
 * @brief Decode SIM7600 GNSS reports into integer position and time fields.
 *
 * The pure parser supports the full +CGNSSINFO report with satellite counts
 * and the +CGPSINFO fallback. The fixes use degrees and decimal minutes,
 * DDMMYY dates, UTC hhmmss.s timestamps and speeds in knots before conversion.
 * An empty fix report returns IVTS_OK with fix_valid cleared. See sections
 * 17.2.2 and 17.2.21 of SIM7500_SIM7600 Series AT Command Manual V2.00.
 */

/** Parse a full +CGNSSINFO report. Returns an error for a malformed line. */
ivts_err_t gnss_parse_cgnssinfo(const char *line, ivts_gnss_t *out);

/** Parse a fallback +CGPSINFO report. Returns an error for a malformed line. */
ivts_err_t gnss_parse_cgpsinfo(const char *line, ivts_gnss_t *out);

/**
 * @brief Convert NMEA degrees and minutes to signed degrees times 10^7.
 *
 * For example, "3113.330650" with 'N' gives 312221775. South and west are
 * negative.
 *
 * @param hemi 'N' or 'S' selects latitude. 'E' or 'W' selects longitude.
 * @retval IVTS_OK Conversion succeeded.
 * @retval IVTS_ERR_INVALID_ARG Missing input, malformed number, invalid
 * hemisphere, minutes of at least 60, or coordinate outside its valid range.
 */
ivts_err_t gnss_nmea_to_e7(const char *ddmm, char hemi, int32_t *out);

/** Convert a DDMMYY date and UTC hhmmss with optional fraction to Unix milliseconds. */
ivts_err_t gnss_datetime_to_unix_ms(const char *ddmmyy, const char *hhmmss, uint64_t *out);

/** @brief Execute an HTTP operation on the modem task and return its result. */
ivts_err_t modem_http_handle(const modem_req_t *request);
bool modem_http_on_line(const char *line);
bool modem_http_route_raw(const uint8_t *data, size_t len, bool is_last);
void modem_http_discard_raw(void);
