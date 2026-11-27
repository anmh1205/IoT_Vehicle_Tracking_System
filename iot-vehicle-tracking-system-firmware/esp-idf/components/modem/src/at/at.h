/**
 * @file at.h
 * @brief Private AT engine, parser and received-byte dispatch interfaces.
 *
 * The modem task serializes one active AT command. The engine takes a write
 * callback and monotonic time. Start the command, deliver received lines and
 * any prompt, then poll until the result or deadline. Parser and engine code
 * can run on the host without UART or FreeRTOS.
 */
#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/base/time.h"

#define AT_RESP_MAX 192u   /**< Captured response line capacity, including its trailing NUL. */

/** One AT command and its completion criteria. */
typedef struct {
    const char    *text;            /**< Command text. The engine writes the trailing carriage return. */
    const char    *capture;         /**< Optional response prefix to capture, such as "+CPIN:". */
    const char    *final_prefix;    /**<
     * With NULL, OK completes the command. Otherwise wait for the final
     * prefix.
     */
    uint8_t        final_err_field; /**<
     * When nonzero, select the 1-based error field after the colon. A zero
     * field value means success. For example, "+CMQTTPUB: 0,<err>" uses field
     * 2 and "+CMQTTSTART: <err>" uses field 1. Zero disables field extraction.
     */
    const uint8_t *data;            /**< Optional bytes to transmit once the modem issues the '>' prompt. */
    size_t         data_len;        /**< Number of bytes available at @c data. */
    uint32_t       timeout_ms;      /**< Maximum command duration in milliseconds. */
    bool           redact;          /**< Suppress logging of a command containing credentials or a private URL. */
    bool           final_exact;     /**< Match the full final line when the criterion includes its terminal value. */
} at_cmd_t;

/** Result of an AT command. */
typedef enum {
    AT_RES_PENDING = 0,   /**< Command still in progress. */
    AT_RES_OK,            /**< Command completed successfully. */
    AT_RES_ERROR,         /**< The modem reported an error or returned a nonzero terminal error field. */
    AT_RES_TIMEOUT        /**< The command deadline expired. */
} at_result_t;

/** Injected byte writer used by the AT engine. */
typedef struct {
    void (*write)(void *ctx, const void *buf, size_t n);   /**< Write @p n bytes without waiting for a response. */
    void *ctx;                                             /**< Context passed to write(). */
} at_tx_t;

/** Engine state. The caller reads response data without mutating engine fields. */
typedef struct {
    at_tx_t     tx;
    at_cmd_t    cmd;          /**< Shallow command copy. Referenced buffers remain caller-owned. */
    ivts_ms_t   deadline;     /**< Monotonic deadline of the active command in milliseconds. */
    bool        busy;         /**< A command is active. */
    bool        ok_seen;      /**< The modem sent OK and may still owe the configured final response. */
    bool        data_sent;    /**< Prevents sending the data buffer again on a duplicate prompt. */
    at_result_t result;       /**< Result of the most recent command. */
    char        resp[AT_RESP_MAX];   /**< Last captured response, final line or modem error. */
} at_engine_t;

/** Initialize an idle engine with the supplied byte writer @p tx. */
void at_engine_init(at_engine_t *e, at_tx_t tx);

/**
 * @brief Send a command and start its completion deadline.
 * @param now Current monotonic time in milliseconds.
 * @retval IVTS_OK The command was written.
 * @retval IVTS_ERR_INVALID_STATE A command is already active.
 * @retval IVTS_ERR_INVALID_ARG The command or its text is missing.
 */
ivts_err_t at_engine_start(at_engine_t *e, const at_cmd_t *cmd, ivts_ms_t now);

/**
 * @brief Offer one modem line to the active command.
 * @return true when consumed. The caller can route other lines as URCs or
 * ignore an unrecognized response.
 */
bool at_engine_on_line(at_engine_t *e, const char *line);

/** Handle a data prompt and transmit the command's bytes once. */
void at_engine_on_prompt(at_engine_t *e);

/**
 * @brief Check the command deadline and return its current status.
 * @return AT_RES_PENDING while active, otherwise the final result.
 */
at_result_t at_engine_poll(at_engine_t *e, ivts_ms_t now);

/**
 * @brief UART framing for text lines, prompts and blocks of raw data.
 *
 * Dispatch feeds individual bytes on the modem task. The parser keeps framing
 * state but performs no UART I/O or clock access.
 */

#define AT_LINE_MAX 256u   /**< Buffer capacity for one line or a raw data chunk. */

/** Type of unit returned when feeding one byte. */
typedef enum {
    AT_UNIT_NONE = 0,   /**< No complete unit yet. */
    AT_UNIT_LINE,       /**< buf holds a NUL-terminated line with CR and LF removed. */
    AT_UNIT_PROMPT,     /**< The modem is requesting input with a leading '>'. */
    AT_UNIT_DATA        /**< buf holds len raw bytes from the current block. */
} at_unit_t;

/** Incremental parser state. buf and len describe the last returned unit. */
typedef struct {
    char   buf[AT_LINE_MAX];
    size_t len;
    size_t raw_left;      /**< Number of raw bytes still expected. Positive while in raw mode. */
    bool   overflow;      /**< The input line exceeded the buffer and its trailing bytes were discarded. */
    bool   skip_lf;       /**< Discard the LF that follows a processed CR terminator. */
    bool   skip_prompt_space;
    bool   unit_done;     /**< The previous unit was delivered. The next feed can reuse the buffer. */
} at_parser_t;

/** Reset the parser to its initial state. */
void at_parser_init(at_parser_t *p);

/**
 * @brief Feed one byte into the parser.
 * @return A complete unit type or AT_UNIT_NONE. buf and len are valid until
 * the next call to at_parser_feed().
 */
at_unit_t at_parser_feed(at_parser_t *p, uint8_t b);

/**
 * @brief Treat the next @p n bytes as raw data.
 *
 * Call just after parsing a header that declares the length, such as
 * "+CMQTTRXPAYLOAD: 0,17". AT_UNIT_DATA returns chunks no larger than the
 * buffer.
 */
void at_parser_expect_raw(at_parser_t *p, size_t n);

/** Classification for one modem text line. */
typedef enum {
    AT_LINE_INFO = 0,     /**< Intermediate command response. */
    AT_LINE_OK,           /**< "OK". */
    AT_LINE_ERROR,        /**< "ERROR", "+CME ERROR:" or "+CMS ERROR:". */
    AT_LINE_URC           /**< Unsolicited result code with a known prefix. */
} at_line_kind_t;

/** Classify a text line for AT dispatch. */
at_line_kind_t at_classify(const char *line);

/** @return true when @p line starts with @p prefix, using a case-sensitive match. */
bool at_has_prefix(const char *line, const char *prefix);

/**
 * @brief Parse the zero-based comma-delimited integer field @p idx after the colon.
 * @return false for a missing, malformed or out-of-range int32_t field.
 */
bool at_field_int(const char *line, unsigned idx, int32_t *out);

/* Initialize the engine and its parser before the modem task starts. */
void modem_at_dispatch_init(void);
/* Modem task. Pump UART or run one synchronous AT command while servicing URCs. */
void modem_at_dispatch_pump(uint32_t wait_ms);
void modem_expect_raw(size_t len);
at_result_t modem_at(const at_cmd_t *command);
at_result_t modem_at_simple(const char *command, uint32_t timeout_ms);
const char *modem_at_response(void);
