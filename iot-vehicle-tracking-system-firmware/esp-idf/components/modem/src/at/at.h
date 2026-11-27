/**
 * @file src/at/at.h
 * @brief Private AT engine, parser and received-byte dispatch interfaces.
 *
 * Link, MQTT, GNSS and HTTPS services run AT commands on the modem task.
 * Dispatch owns one engine and parser, pumps UART and routes unclaimed lines and raw chunks to the services.
 * Transport owns UART I/O. The engine and parser use injected bytes and time and also run in host tests.
 * Response storage belongs to the engine and remains valid until the next command changes it.
 */
#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/base/time.h"

#define AT_RESP_MAX 192u   /**< Captured response line capacity in bytes, including its trailing NUL. */

/** @brief Caller-owned AT command descriptor. The engine retains a shallow copy during execution. */
typedef struct {
    const char    *text;            /**< Required NUL-terminated command. The engine appends a carriage return. */
    const char    *capture;         /**< Optional NUL-terminated intermediate-response prefix, such as "+CPIN:". */
    const char    *final_prefix;    /**< Final line or prefix. NULL lets OK complete the command. */
    uint8_t        final_err_field; /**< One-based result field after the colon. A zero value disables the check.
                                         For example, "+CMQTTPUB: 0,<err>" selects field 2. */
    const uint8_t *data;            /**< Borrowed input bytes sent on the first prompt. */
    size_t         data_len;        /**< Number of bytes available at @c data. */
    uint32_t       timeout_ms;      /**< Command deadline interval in milliseconds. */
    bool           redact;          /**< Hide command and captured response in command-completion logs. */
    bool           final_exact;     /**< Require a full final-line match when a final criterion is set. */
} at_cmd_t;

/** @brief Result of an AT command. */
typedef enum {
    AT_RES_PENDING = 0,   /**< Command still in progress or engine newly initialized. */
    AT_RES_OK,            /**< Command completed successfully. */
    AT_RES_ERROR,         /**< Command could not start or the modem reply reports failure. */
    AT_RES_TIMEOUT        /**< Polling finds the active command deadline expired. */
} at_result_t;

/** @brief Byte-writer binding copied into the engine. Its context remains caller-owned. */
typedef struct {
    void (*write)(void *ctx, const void *buf, size_t n);   /**< Consume or copy bytes during the call. */
    void *ctx;                                             /**< Context passed to write(). NULL if accepted. */
} at_tx_t;

/** @brief Caller-owned engine state. One execution context serializes all mutations. */
typedef struct {
    at_tx_t     tx;           /**< Byte writer and borrowed context supplied at initialization. */
    at_cmd_t    cmd;          /**< Shallow command copy. Referenced buffers remain caller-owned. */
    ivts_ms_t   deadline;     /**< Monotonic deadline of the active command in milliseconds. */
    bool        busy;         /**< A command is active. */
    bool        ok_seen;      /**< The modem sent OK after any required command data. */
    bool        data_sent;    /**< Prevents sending the data buffer again on a duplicate prompt. */
    at_result_t result;       /**< Result of the most recent command. */
    char        resp[AT_RESP_MAX];   /**< Last captured response, final line or modem error, NUL-terminated. */
} at_engine_t;

/**
 * @brief Initialize an idle engine with a byte writer.
 *
 * @param[out] e Required caller-owned engine storage, cleared before binding the writer.
 * @param tx Writer binding copied by value. Its callback and context must remain usable through command execution.
 * @note Context: Modem startup, or a serialized host caller. Blocking: Non-blocking.
 */
void at_engine_init(at_engine_t *e, at_tx_t tx);

/**
 * @brief Send a command and start its completion deadline.
 *
 * @param e Required initialized engine.
 * @param cmd Descriptor copied by value. Non-NULL strings and data buffers stay valid until completion.
 * @param now Current monotonic time in milliseconds.
 * @retval IVTS_OK The engine passes the command to the writer and marks it pending.
 * @retval IVTS_ERR_INVALID_STATE A command is already active.
 * @retval IVTS_ERR_INVALID_ARG The command or its text is NULL.
 * @note Context: Modem task, or a serialized host caller. Blocking: Invokes the writer synchronously.
 *       The UART writer may wait for transmit space. This function does not wait for a response.
 */
ivts_err_t at_engine_start(at_engine_t *e, const at_cmd_t *cmd, ivts_ms_t now);

/**
 * @brief Offer one modem line to the active command.
 *
 * Command criteria take precedence over URC classification. A configured final line can complete without
 * a separate OK. A data command requires its prompt before accepting either success signal.
 *
 * @param e Required initialized engine.
 * @param line Required NUL-terminated line borrowed for the call.
 * @retval true The active command claims the line, including command echo.
 * @retval false No active command claims the line. Dispatch can route it to a protocol handler.
 * @note Context: Modem task, or a serialized host caller. Blocking: Non-blocking.
 */
bool at_engine_on_line(at_engine_t *e, const char *line);

/**
 * @brief Transmit an active data command's body on its first prompt.
 *
 * @param e Required initialized engine.
 * @note Context: Modem task, or a serialized host caller. Blocking: Invokes the writer synchronously
 *       if data is pending. The UART writer may wait for transmit space.
 */
void at_engine_on_prompt(at_engine_t *e);

/**
 * @brief Expire the active command at its deadline and read the result.
 *
 * @param e Required initialized engine.
 * @param now Current monotonic time in milliseconds.
 * @return AT_RES_PENDING while active or before the first command, otherwise the final result.
 * @note Context: Modem task, or a serialized host caller. Blocking: Non-blocking.
 */
at_result_t at_engine_poll(at_engine_t *e, ivts_ms_t now);

/* Dispatch feeds UART framing one byte at a time. The parser keeps state across reads. */

#define AT_LINE_MAX 256u   /**< Capacity in bytes for one raw chunk or one line including its trailing NUL. */

/** @brief Type of unit returned when feeding one byte. */
typedef enum {
    AT_UNIT_NONE = 0,   /**< No complete unit yet. */
    AT_UNIT_LINE,       /**< buf holds a NUL-terminated line without its CR or LF terminator. */
    AT_UNIT_PROMPT,     /**< The modem is requesting input with a leading '>'. */
    AT_UNIT_DATA        /**< buf holds len raw bytes from the current block. */
} at_unit_t;

/** @brief Caller-owned incremental parser state. One context feeds bytes and consumes the units. */
typedef struct {
    char   buf[AT_LINE_MAX];  /**< Parser-owned line or raw chunk storage reused on the next feed. */
    size_t len;              /**< Bytes buffered, excluding any text terminator. */
    size_t raw_left;      /**< Number of raw bytes still expected. Positive while in raw mode. */
    bool   overflow;      /**< Discard the current line through its terminator after excess bytes or a NUL. */
    bool   skip_lf;       /**< Discard one optional LF after a processed CR terminator. */
    bool   skip_prompt_space;  /**< Discard one optional space immediately after a prompt. */
    bool   unit_done;     /**< The previous unit was delivered. The next feed can reuse the buffer. */
} at_parser_t;

/**
 * @brief Reset the parser, dropping any buffered unit.
 *
 * @param[out] p Required caller-owned parser storage.
 * @note Context: Modem startup or task, or a serialized host caller. Blocking: Non-blocking.
 */
void at_parser_init(at_parser_t *p);

/**
 * @brief Feed one UART byte into the parser.
 *
 * The parser keeps partial state across reads. It discards overlong or NUL-containing text lines.
 *
 * @param p Required initialized parser.
 * @param b Next byte of the UART stream.
 * @return A complete unit type or AT_UNIT_NONE. A returned line or raw chunk remains usable until the next
 *         feed, reset or raw-mode request.
 * @note Context: Modem task, or a serialized host caller. Blocking: Non-blocking.
 */
at_unit_t at_parser_feed(at_parser_t *p, uint8_t b);

/**
 * @brief Treat the next @p n data bytes as raw input.
 *
 * Call after a length-bearing header. The parser still consumes the header's optional trailing LF.
 * AT_UNIT_DATA returns chunks no larger than AT_LINE_MAX.
 *
 * @param p Required initialized parser. The function resets the buffered length.
 * @param n Raw byte count. Zero leaves the parser in text mode.
 * @note Context: Modem task, or a serialized host caller. Blocking: Non-blocking.
 */
void at_parser_expect_raw(at_parser_t *p, size_t n);

/** @brief Classification for one modem text line. */
typedef enum {
    AT_LINE_INFO = 0,     /**< Line with no recognized result or URC prefix. */
    AT_LINE_OK,           /**< "OK". */
    AT_LINE_ERROR,        /**< "ERROR", "+CME ERROR:" or "+CMS ERROR:". */
    AT_LINE_URC           /**< Line with a recognized unsolicited result prefix. */
} at_line_kind_t;

/**
 * @brief Classify a text line for AT completion.
 *
 * @param line Required NUL-terminated line borrowed for the call.
 * @return The recognized line kind or AT_LINE_INFO for other text.
 * @note Context: Modem task or host caller. Blocking: Non-blocking.
 */
at_line_kind_t at_classify(const char *line);

/**
 * @brief Check for a case-sensitive prefix.
 *
 * @param line Required NUL-terminated input borrowed for the call.
 * @param prefix Required NUL-terminated prefix borrowed for the call. Empty matches any line.
 * @retval true The prefix matches.
 * @retval false The prefix does not match.
 * @note Context: Modem task or host caller. Blocking: Non-blocking.
 */
bool at_has_prefix(const char *line, const char *prefix);

/**
 * @brief Parse a zero-based comma-delimited integer field after the first colon.
 *
 * @param line Required NUL-terminated line borrowed for the call.
 * @param idx Zero-based field index. Only the selected field is validated.
 * @param[out] out Required signed 32-bit output, untouched on failure.
 * @retval true The selected field is a valid decimal int32_t.
 * @retval false The colon or field is missing, or the field is malformed or out of range.
 * @note Context: Modem task or host caller. Blocking: Non-blocking.
 */
bool at_field_int(const char *line, unsigned idx, int32_t *out);

/**
 * @brief Initialize the dispatch engine and parser and bind the UART writer.
 *
 * @note Context: Modem startup before the task starts. Blocking: Non-blocking.
 */
void modem_at_dispatch_init(void);
/**
 * @brief Pump one UART batch into the AT, MQTT and HTTP handlers.
 *
 * An expired raw frame is discarded and UART input is flushed before the next read.
 *
 * @param wait_ms UART receive wait in milliseconds before native tick conversion.
 * @note Context: Modem task. Blocking: Waits for UART input using @p wait_ms. Dispatch can also
 *       wait for UART transmit space on a data prompt or for the slot mutex on a command delivery.
 */
void modem_at_dispatch_pump(uint32_t wait_ms);
/**
 * @brief Arm raw framing for the length declared by a protocol header.
 *
 * @param len Number of bytes in the raw block. Zero leaves the parser in text mode.
 * @note Context: Modem task during HTTP or MQTT line dispatch. Blocking: Non-blocking.
 */
void modem_expect_raw(size_t len);
/**
 * @brief Run one AT command while pumping UART and dispatching URCs.
 *
 * @param command Required descriptor with borrowed strings and optional data valid through return.
 * @return Terminal AT result. AT_RES_ERROR also covers failure to start the command.
 * @note Context: Modem task. Blocking: Pumps UART in 20 ms receive waits and checks the command deadline
 *       after each batch. UART writes and inline dispatch add time outside the nominal deadline.
 * @warning Call only outside an active command.
 */
at_result_t modem_at(const at_cmd_t *command);
/**
 * @brief Run an AT command that completes on OK or a modem error.
 *
 * @param command Required NUL-terminated command borrowed through return. The completion log may include it.
 * @param timeout_ms Nominal command deadline interval in milliseconds.
 * @return Terminal AT result, including AT_RES_ERROR if the command cannot start.
 * @note Context: Modem task. Blocking: Uses the same UART waits and deadline polling as modem_at().
 */
at_result_t modem_at_simple(const char *command, uint32_t timeout_ms);
/**
 * @brief Borrow the AT engine's current response.
 *
 * @return NUL-terminated engine storage, valid until the next command starts.
 * @note Context: Modem task after command completion. Blocking: Non-blocking.
 */
const char *modem_at_response(void);
