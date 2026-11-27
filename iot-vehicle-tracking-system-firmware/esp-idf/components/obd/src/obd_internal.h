/**
 * @file src/obd_internal.h
 * @brief Private BLE events, ELM framing, session control and OBD polling.
 *
 * NimBLE callbacks post copies. The OBD task alone updates the active session and starts requests.
 * Readiness and trouble codes are exposed through a mutex-protected copy. Decoders use caller-owned buffers.
 * The app controls when polling is enabled and consumes results through the public contract.
 */
#pragma once
#include "obd/obd.h"
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/telemetry.h"
#include "ivts_core/model/obd.h"

#define OBD_TAG "obd"   /**< UART log tag for BLE, ELM327 and ECU operations. */

/**
 * @brief Borrow the copied OBD configuration.
 * @return Read-only pointer to the component-owned configuration for this boot.
 * @note Context: OBD task or NimBLE callback after initialization. Non-blocking.
 */
const obd_cfg_t *obd_config(void);
/**
 * @brief Forward an OBD event through the app sink.
 * @param event Non-null event borrowed for the callback. The sink must copy it to retain it.
 * @note Context: OBD task. Calls the sink synchronously. The app sink enqueues with zero wait.
 */
void obd_emit(const ivts_event_t *event);

#define OBD_SERVICE_UUID 0x18F0u   /**< 16-bit GATT service UUID selected during OBD adapter discovery. */

/**
 * @brief Initialize NimBLE and start its host task.
 * @retval 0 Host startup is requested. Synchronization is reported separately.
 * @retval -1 SDK initialization fails.
 * @note Context: OBD task. Synchronous SDK initialization with no component-level timeout.
 */
int  obd_ble_init(void);
/**
 * @brief Stop and deinitialize the NimBLE host and controller.
 * @retval 0 The stop and deinitialization calls succeed.
 * @retval -1 Either SDK call fails.
 * @note Context: OBD task. Blocks on host stop and deinitialization with no component-level timeout.
 */
int  obd_ble_deinit(void);
/**
 * @brief Start an active BLE scan and filter duplicate advertisements.
 * Candidate advertisements and scan completion are posted as events. The scan duration is 10000 ms.
 * @return Zero if the SDK accepts the request, otherwise the NimBLE result.
 * @note Context: OBD task with a synchronized NimBLE host. Submits to NimBLE without waiting for completion.
 */
int  obd_ble_scan(void);
/**
 * @brief Request cancellation of the active scan if one exists.
 * SDK cancellation errors are discarded.
 * @note Context: OBD task. No wait for scan completion.
 */
void obd_ble_scan_stop(void);
/**
 * @brief Cancel scanning and initiate a BLE connection.
 * @param addr Borrowed seven bytes containing address type followed by six NimBLE-order address bytes.
 * @return Zero if the SDK accepts the 10000 ms connection request, otherwise the NimBLE result.
 * @note Context: OBD task with a synchronized NimBLE host. Submits to NimBLE without waiting for completion.
 */
int  obd_ble_connect(const uint8_t addr[7]);
/**
 * @brief Start discovery of the OBD GATT service.
 * @param conn Active BLE connection handle.
 * @return Zero if discovery is submitted, otherwise the NimBLE result. Callback events carry the results.
 * @note Context: OBD task with a synchronized NimBLE host. Submits to NimBLE without waiting for completion.
 */
int  obd_ble_disc_svc(uint16_t conn);
/**
 * @brief Start characteristic discovery in the selected service.
 * @param conn Active BLE connection handle.
 * @param start First GATT attribute handle in the service.
 * @param end Last GATT attribute handle in the service.
 * @return Zero if discovery is submitted, otherwise the NimBLE result. Callback events carry the results.
 * @note Context: OBD task with a synchronized NimBLE host. Submits to NimBLE without waiting for completion.
 */
int  obd_ble_disc_chrs(uint16_t conn, uint16_t start, uint16_t end);
/**
 * @brief Start descriptor discovery after a characteristic value.
 * @param conn Active BLE connection handle.
 * @param value_handle Characteristic value handle before the requested descriptors.
 * @param end Last handle to search, greater than value_handle.
 * @return Zero if discovery is submitted, otherwise the NimBLE result. Callback events carry the results.
 * @note Context: OBD task with a synchronized NimBLE host. Submits to NimBLE without waiting for completion.
 */
int  obd_ble_disc_dscs(uint16_t conn, uint16_t value_handle, uint16_t end);
/**
 * @brief Submit a write enabling notifications on the RX characteristic.
 * @param conn Active BLE connection handle.
 * @param cccd Client Characteristic Configuration Descriptor handle.
 * @return Zero if the write is submitted, otherwise the NimBLE result. A write event reports completion.
 * @note Context: OBD task with a synchronized NimBLE host. Submits to NimBLE without waiting for completion.
 */
int  obd_ble_enable_notify(uint16_t conn, uint16_t cccd);
/**
 * @brief Submit a write without response on the adapter TX characteristic.
 * @param conn Active BLE connection handle.
 * @param handle TX value handle from discovery.
 * @param s Borrowed NUL-terminated command line, including the carriage return and fitting in the BLE write.
 * @return Zero if the SDK accepts the write, otherwise the NimBLE result.
 * @note Context: OBD task with a synchronized NimBLE host. Submits to NimBLE without waiting for completion.
 */
int  obd_ble_write(uint16_t conn, uint16_t handle, const char *s);
/**
 * @brief Request termination of a BLE connection.
 * @param conn BLE connection handle. The SDK result is discarded.
 * @note Context: OBD task. No wait for the disconnect event.
 */
void obd_ble_disconnect(uint16_t conn);
/**
 * @brief Match a BLE address to a configured target string.
 * @param addr Borrowed seven-byte typed address in NimBLE byte order.
 * @param want Borrowed NUL-terminated, colon-separated hex address or an empty target.
 * @retval true The target is empty or the address matches without regard to case.
 * @retval false The address differs.
 * @note Context: NimBLE advertisement callback. Non-blocking.
 */
bool obd_ble_addr_matches(const uint8_t addr[7], const char *want);

/**
 * @brief Read the cached local NimBLE address type.
 * @return Address type set by the host synchronization callback.
 * @note Context: OBD task after receiving the sync event. Non-blocking.
 */
uint8_t obd_ble_own_addr_type(void);

/** @brief BLE callback and control event kinds dispatched by the OBD task. */
typedef enum {
    OBD_BLE_EV_SYNCED = 0,     /**< NimBLE host synchronized with the controller. */
    OBD_BLE_EV_ADV,            /**< Advertising report received during an active scan. */
    OBD_BLE_EV_SCAN_DONE,      /**< Adapter scan completed. */
    OBD_BLE_EV_CONNECTED,      /**< Connection result carrying status and connection handle. */
    OBD_BLE_EV_DISCONNECTED,   /**< BLE disconnected. */
    OBD_BLE_EV_SVC,            /**< GATT service handle range found during discovery. */
    OBD_BLE_EV_CHR,            /**< GATT characteristic UUID and value handle. */
    OBD_BLE_EV_DSC,            /**< GATT descriptor UUID and handle. */
    OBD_BLE_EV_DISC_DONE,      /**< A GATT discovery operation finished. */
    OBD_BLE_EV_WRITE_DONE,     /**< GATT write completion. */
    OBD_BLE_EV_NOTIFY,         /**< ELM327 reply fragment received through a GATT notification. */
    OBD_BLE_EV_CTRL_CHANGED    /**< Wake the OBD worker after obd_start() or obd_stop(). */
} obd_ble_event_type_t;

/** @brief Tagged value copied into the event queue by the producer and owned by the OBD task on receipt. */
typedef struct {
    uint8_t type;   /**< Event kind from obd_ble_event_type_t. */
    int16_t status;   /**< SDK status or disconnect reason where provided. Zero indicates success. */
    uint16_t conn;   /**< BLE connection handle where applicable. */
    union {
        struct { uint8_t address[7]; /**< Type and six NimBLE-order address bytes.
         */ } advertisement; /**< Candidate scan result. */
        struct { uint16_t start_handle, /**< First handle. */ end_handle; /**< Last handle.
         */ } service; /**< Service result. */
        struct { uint16_t definition_handle, /**< Declaration handle. */ value_handle, /**< Value handle.
         */ uuid16; /**< 16-bit UUID or zero. */ } characteristic; /**< Found characteristic. */
        struct { uint16_t handle, /**< Attribute handle. */ uuid16; /**< 16-bit UUID or zero.
         */ } descriptor; /**< Descriptor result. */
        struct { uint16_t handle; /**< Attribute handle. */ uint8_t len; /**< Payload byte count.
         */ uint8_t data[UINT8_MAX]; /**< Copied host bytes. */ } notification; /**< Reply fragment. */
    };   /**< Payload selected by the event type. */
} obd_ble_event_t;

/**
 * @brief Frame and decode ELM327 text replies.
 *
 * These routines operate on caller-owned buffers and can run without BLE. The
 * prompt '>' marks the end of a complete response.
 */

#define ELM_REPLY_MAX 512u   /**< ELM response capacity, including the trailing NUL. */

/** @brief One immutable step in the ELM initialization table. Command text has static lifetime. */
typedef struct {
    const char *cmd;          /**< AT command text without its trailing carriage return. */
    uint32_t    timeout_ms;   /**< Response deadline in milliseconds. ATZ allows time for a restart. */
    bool        is_reset;     /**< True requires a reset banner. False requires an OK line. */
} elm_init_step_t;

extern const elm_init_step_t ELM_INIT_SEQ[];   /**< ELM327 initialization commands in execution order. */
extern const size_t ELM_INIT_SEQ_LEN;          /**< Number of entries in ELM_INIT_SEQ. */

/** @brief Caller-owned reply assembly. The OBD task updates it during a live session. */
typedef struct {
    char   buf[ELM_REPLY_MAX];   /**< Accumulated reply, maintained as a NUL-terminated string. */
    size_t len;                  /**< Number of reply bytes currently in buf. */
    bool   complete;             /**< The '>' prompt indicates a complete reply. */
    bool   overflow;             /**< At least one non-padding byte does not fit in the buffer. */
} elm_rx_t;

/**
 * @brief Reset the reply assembler for a new command.
 * @param r Non-null state whose saved reply and flags are cleared.
 * @note Context: OBD task or host test with caller-owned buffers. Non-blocking.
 */
void elm_rx_reset(elm_rx_t *r);

/**
 * @brief Append notification bytes until the ELM prompt arrives.
 *
 * Ignore NUL padding and bytes after the first prompt. A full buffer sets overflow but input can
 * still complete the reply when the prompt arrives.
 *
 * @param[in,out] r Non-null assembler state.
 * @param data Borrowed bytes for this fragment. May be NULL if n is zero.
 * @param n Byte count in data.
 * @retval true The prompt has arrived, including for a previously completed reply.
 * @retval false The reply is incomplete.
 * @note Context: OBD task or host test with caller-owned buffers. Non-blocking.
 */
bool elm_rx_feed(elm_rx_t *r, const uint8_t *data, size_t n);

/**
 * @brief Check whether a complete ELM reply meets the expected response form.
 * @param reply Borrowed NUL-terminated text including the prompt. NULL is invalid.
 * @param is_reset True requires an ELM327 or STN banner.
 * @param is_at_command True requires an OK line when is_reset is false.
 * @retval true A prompt is present, no recognized error text appears and the expected form matches.
 * @retval false Input is absent, incomplete, contains an error or fails the form check.
 * @note Context: OBD task or host test with caller-owned buffers. Non-blocking.
 */
bool elm_reply_valid(const char *reply, bool is_reset, bool is_at_command);

/**
 * @brief Classify ECU state from ELM status text or a complete reply.
 * @param reply Optional borrowed NUL-terminated response.
 * @return STOPPED for STOPPED text, NO_DATA for NO DATA or UNABLE TO CONNECT, LIVE for another valid
 *         data reply, or UNKNOWN. LIVE here indicates the reply form, without decoding any PID.
 * @note Context: OBD task or host test with caller-owned buffers. Non-blocking.
 */
ivts_ecu_state_t elm_reply_ecu_state(const char *reply);

/**
 * @brief Extract the first matching service response from ELM text.
 *
 * Start at the first byte equal to mode plus 0x40, then append decodable colon-prefixed continuation
 * lines. Stop at a subsequent decodable unprefixed line. Output is capped at the supplied capacity.
 *
 * @param reply Borrowed NUL-terminated reply containing an ELM prompt.
 * @param mode Requested service byte.
 * @param[out] out Non-null byte buffer. Unchanged when no service matches or the input is invalid.
 * @param cap Positive destination capacity in bytes.
 * @param[out] n Non-null destination for the copied byte count. Zero on no match and untouched on invalid
 *       input.
 * @retval IVTS_OK A matching response prefix was found, possibly with truncated bytes.
 * @retval IVTS_ERR_NOT_FOUND No reply matched the service.
 * @retval IVTS_ERR_INVALID_ARG A required pointer, a positive capacity or the prompt is missing.
 * @note Context: OBD task or host test with caller-owned buffers. Non-blocking.
 */
ivts_err_t elm_extract_bytes(const char *reply, uint8_t mode, uint8_t *out, size_t cap, size_t *n);

/**
 * @brief Decode OBD-II service 01, 03, 07 and 0A payload bytes.
 *
 * The parsers use caller-owned buffers with no BLE state. PID conversions
 * follow SAE J1979.
 */

/**
 * @brief Decode one supported service 01 PID into a sample.
 * @param b Borrowed reply bytes beginning with 0x41 and the PID.
 * @param n Available byte count, at least three and at least four for RPM.
 * @param[in,out] s Non-null sample. Only the decoded field and its validity bit change on success.
 * @retval IVTS_OK The PID was decoded.
 * @retval IVTS_ERR_NOT_FOUND The PID is unsupported. The sample is unchanged.
 * @retval IVTS_ERR_INVALID_ARG Input is missing, short or has the wrong service prefix. The sample is
 *       unchanged.
 * @note Context: OBD task or host test with caller-owned buffers. Non-blocking.
 */
ivts_err_t obd_pid_decode(const uint8_t *b, size_t n, ivts_obd_sample_t *s);

/**
 * @brief Decode readiness from service 01 PID 0x01.
 * @param b Borrowed response bytes starting with 0x41, 0x01 and monitor bytes A through D.
 * @param n Available byte count, at least six.
 * @param[out] r Non-null destination reset and filled on success. Unchanged on failure.
 * @retval IVTS_OK Readiness is decoded and marked valid.
 * @retval IVTS_ERR_INVALID_ARG Input is missing, short or has the wrong service or PID.
 * @note Context: OBD task or host test with caller-owned buffers. Non-blocking.
 */
ivts_err_t obd_readiness_decode(const uint8_t *b, size_t n, ivts_obd_readiness_t *r);

/**
 * @brief Decode a stored, pending or permanent trouble-code list.
 * @param b Borrowed response beginning with 0x43, 0x47 or 0x4A. An odd payload length skips the first payload
 *       byte.
 * @param n Available bytes including the response service, at least one.
 * @param[out] d Non-null destination reset and filled on success. Unchanged on failure.
 * @retval IVTS_OK Up to IVTS_DTC_MAX_CODES nonzero pairs are formatted, with truncation flagged for extra
 *       codes.
 * @retval IVTS_ERR_INVALID_ARG A pointer is missing, the response is empty or the service prefix is
 *       unsupported.
 * @note Context: OBD task or host test with caller-owned buffers. Non-blocking.
 */
ivts_err_t obd_dtc_decode(const uint8_t *b, size_t n, ivts_dtc_list_t *d);

/**
 * @brief Format a two-byte trouble code as five printable characters and a terminator.
 * @param hi High byte carrying the system and first two digits.
 * @param lo Low byte carrying the final two digits.
 * @param[out] out Non-null writable IVTS_DTC_CODE_SIZE-byte buffer.
 * @note Context: OBD task or host test with caller-owned buffers. Non-blocking.
 */
void obd_dtc_format(uint8_t hi, uint8_t lo, char out[IVTS_DTC_CODE_SIZE]);

/** @brief OBD-task-owned link and ELM exchange state. Session and polling helpers borrow it. */
typedef struct {
    bool is_synced;   /**< The NimBLE sync event has been observed. */
    bool is_connected;   /**< The OBD task tracks an active BLE connection. */
    bool is_ecu_ready;   /**< ECU probe has succeeded and poll state still considers it ready. */
    uint16_t connection;   /**< Current BLE connection handle when connected. */
    uint16_t rx_handle;   /**< Characteristic value handle for incoming notifications. */
    uint16_t tx_handle;   /**< Characteristic value handle for outgoing writes. */
    elm_rx_t reply;   /**< Assembler for the current ELM response. */
} obd_session_t;

/**
 * @brief Scan, connect, configure GATT and initialize the ELM327.
 * @param[in,out] session Non-null OBD task state. Failure can leave a connection for the caller to close.
 * @retval true GATT notification setup and the ELM command sequence succeed. ECU readiness awaits probing.
 * @retval false Discovery, connection or initialization fails or is interrupted.
 * @note Context: OBD task. Waits up to 11000 ms each for scan and connect, 5000 ms for each of four GATT
 *       steps, and 3000 ms for reset plus five 1000 ms command waits.
 */
bool obd_session_setup(obd_session_t *session);
/**
 * @brief Send an ELM command and assemble its reply through the terminating prompt.
 * @param[in,out] session Non-null connected session with discovered handles. Its previous reply is replaced.
 * @param command Borrowed NUL-terminated command with at most 14 characters, without the appended carriage
 *       return.
 * @param timeout_ms Notification wait budget in milliseconds.
 * @retval true A complete reply fits in the buffer. Reply content still needs validation.
 * @retval false The write fails or the reply wait times out, is interrupted or overflows.
 * @note Context: OBD task with RX notifications enabled. Waits for the prompt for up to timeout_ms.
 */
bool obd_session_command(obd_session_t *session, const char *command, uint32_t timeout_ms);
/**
 * @brief Publish a changed BLE, ELM and ECU state tuple.
 * Identical tuples are suppressed. The remembered state advances even if delivery fails.
 * @param connected Whether the BLE link is up.
 * @param elm_ready Whether the ELM initialization sequence has completed.
 * @param ecu ECU state associated with the link.
 * @note Context: OBD task. Calls the sink synchronously. The app sink enqueues with zero wait.
 */
void obd_session_emit_link(bool connected, bool elm_ready, ivts_ecu_state_t ecu);

/**
 * @brief Discover OBD GATT handles and enable RX notifications.
 * @param[in,out] session Non-null connected state. RX and TX handles are only updated on success.
 * @retval true Service, characteristics, descriptor and notification write complete.
 * @retval false A step fails, times out, is interrupted or lacks a required result.
 * @note Context: OBD task. Four successive waits of up to 5000 ms each.
 */
bool obd_discovery_configure(obd_session_t *session);

#define OBD_BLE_WAIT_ANY  0xffu   /**< Accept any tracked event during a wait. */
#define OBD_BLE_WAIT_NONE 0xfeu   /**< Drain events until interrupted or timed out. */

/**
 * @brief Create the BLE event queue, diagnostic mutex and OBD worker.
 * @retval 0 The worker starts.
 * @retval -1 Allocation or task creation fails.
 * @note Context: App startup. No wait for the new worker to run.
 */
int obd_task_start(void);
/**
 * @brief Publish the desired OBD state and attempt to wake the worker.
 * @param enabled True requests discovery and polling. False requests BLE shutdown.
 * @retval IVTS_OK The atomic request is stored, even if the wake event cannot be queued.
 * @retval IVTS_ERR_INVALID_STATE The event queue is absent.
 * @note Context: App task. Non-blocking.
 */
ivts_err_t obd_task_set_enabled(bool enabled);
/**
 * @brief Read the desired OBD state.
 * @retval true Start or continued polling is requested.
 * @retval false Stop or continued idle is requested.
 * @note Context: OBD task. Non-blocking atomic read.
 */
bool obd_task_is_enabled(void);
/**
 * @brief Copy an event into the OBD worker queue.
 * @param event Non-null event borrowed during the copy.
 * @retval true The event is queued.
 * @retval false The queue is absent or full.
 * @note Context: NimBLE host callbacks or app task through the control API. Non-blocking.
 */
bool obd_task_post(const obd_ble_event_t *event);
/**
 * @brief Drain BLE events until a match, interruption or deadline.
 * Tracks synchronization and assembles notification fragments while draining unmatched events.
 *
 * @param[in,out] session Non-null task-owned session.
 * @param want Event kind, OBD_BLE_WAIT_ANY or OBD_BLE_WAIT_NONE. Notification waits match a complete prompt.
 * @param timeout_ms Whole wait budget in milliseconds. Zero returns immediately.
 * @param[out] out Optional event output. Written only for a matched event other than a notification wait.
 * @retval true A match occurs or the requested reply is complete.
 * @retval false Timeout, interrupting control change, current-link disconnect or current notification error.
 * @note Context: OBD task only. Waits on the BLE event queue for up to timeout_ms.
 */
bool obd_task_wait_event(obd_session_t *session, uint8_t want, uint32_t timeout_ms, obd_ble_event_t *out);

/**
 * @brief Allocate the diagnostic copy mutex.
 * @retval true The mutex is available.
 * @retval false Allocation fails.
 * @note Context: App startup before the worker starts. No explicit wait.
 */
bool obd_diag_init(void);
/**
 * @brief Query readiness and trouble-code lists and replace the shared snapshot.
 * @param[in,out] session Non-null connected ELM session. Commands replace its reply.
 * @retval true The round finishes and a snapshot event is attempted, even if individual data are unavailable.
 * @retval false A command fails, the link drops or polling is disabled. The previous snapshot remains.
 * @note Context: OBD task. Waits up to 3000 ms for readiness and 5000 ms for each of three DTC replies,
 *       then can wait without a fixed timeout for the copy mutex.
 */
bool obd_diag_poll(obd_session_t *session);

/**
 * @brief Probe ECU readiness and poll one set of live PIDs.
 * @param[in,out] session Non-null connected ELM session. Readiness and reply state may change.
 * @retval true The probe or poll completes, including when there are no decodable measurements.
 * @retval false A command fails, the link drops or polling is disabled.
 * @note Context: OBD task. Waits up to 15000 ms for a needed ECU probe and 3000 ms for each of five PID
 *       replies.
 */
bool obd_poll_sample(obd_session_t *session);
