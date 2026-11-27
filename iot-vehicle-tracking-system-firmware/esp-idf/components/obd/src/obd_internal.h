/**
 * @file obd_internal.h
 * @brief Private OBD BLE events, ELM session, task and poll interfaces.
 *
 * Callbacks transfer tagged, by-value messages. The OBD task owns active
 * connection state, while the diagnostic snapshot is mutex-protected.
 */
#pragma once
#include "obd/obd.h"
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/telemetry.h"
#include "ivts_core/model/obd.h"

#define OBD_TAG "obd"   /* UART log tag for BLE, ELM327 and ECU lines. */

/* Configuration is set at boot and read by the OBD task and BLE callbacks. */
const obd_cfg_t *obd_config(void);
void obd_emit(const ivts_event_t *event);

#define OBD_SERVICE_UUID 0x18F0u

/* The OBD task initiates NimBLE operations; callbacks post events. */
int  obd_ble_init(void);                                                   /**< Start NimBLE and register its callbacks. */
int  obd_ble_deinit(void);                                                 /**< Stop and deinitialize the NimBLE host and controller. */
int  obd_ble_scan(void);                                                   /**< Start scanning. Advertising reports arrive as OBD_BLE_EV_ADV. */
void obd_ble_scan_stop(void);                                              /**< Stop scanning for an adapter. */
int  obd_ble_connect(const uint8_t addr[7]);                               /**< Connect to the given address type and six address bytes. */
int  obd_ble_disc_svc(uint16_t conn);                                      /**< Discover the OBD service. */
int  obd_ble_disc_chrs(uint16_t conn, uint16_t start, uint16_t end);       /**< Discover characteristics in the specified handle range. */
int  obd_ble_disc_dscs(uint16_t conn, uint16_t value_handle, uint16_t end); /**< Discover descriptors after the value handle. */
int  obd_ble_enable_notify(uint16_t conn, uint16_t cccd);                  /**< Enable notifications by writing the CCCD. */
int  obd_ble_write(uint16_t conn, uint16_t handle, const char *s);         /**< Write bytes to the adapter's TX characteristic. */
void obd_ble_disconnect(uint16_t conn);                                    /**< Terminate the BLE connection. */
/** @return true if @p addr matches @p want, or the target address is empty. */
bool obd_ble_addr_matches(const uint8_t addr[7], const char *want);

uint8_t obd_ble_own_addr_type(void);

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

/* NimBLE callbacks copy one tagged event to the OBD task's queue. */
typedef struct {
    uint8_t type;
    int16_t status;
    uint16_t conn;
    union {
        struct { uint8_t address[7]; } advertisement;
        struct { uint16_t start_handle, end_handle; } service;
        struct { uint16_t definition_handle, value_handle, uuid16; } characteristic;
        struct { uint16_t handle, uuid16; } descriptor;
        struct { uint16_t handle; uint8_t len; uint8_t data[UINT8_MAX]; } notification;
    };
} obd_ble_event_t;

/**
 * @brief Frame and decode ELM327 text replies.
 *
 * These routines operate on caller-owned buffers and can run without BLE. The
 * prompt '>' marks the end of a complete response.
 */

#define ELM_REPLY_MAX 512u   /**< ELM response capacity, including the trailing NUL. */

/** One entry in the adapter initialization sequence. */
typedef struct {
    const char *cmd;          /**< AT command text without its trailing carriage return. */
    uint32_t    timeout_ms;   /**< Response deadline in milliseconds. ATZ allows time for a restart. */
    bool        is_reset;     /**< Reset semantics allow a banner response instead of an OK line. */
} elm_init_step_t;

extern const elm_init_step_t ELM_INIT_SEQ[];   /**< ELM327 initialization commands in execution order. */
extern const size_t ELM_INIT_SEQ_LEN;          /**< Number of entries in ELM_INIT_SEQ. */

/** Incremental ELM response assembled from BLE notification fragments. */
typedef struct {
    char   buf[ELM_REPLY_MAX];   /**< Accumulated reply, maintained as a NUL-terminated string. */
    size_t len;                  /**< Number of reply bytes currently in buf. */
    bool   complete;             /**< The '>' prompt indicates a complete reply. */
    bool   overflow;             /**< The buffer filled before the reply ended. Excess bytes were discarded. */
} elm_rx_t;

/** Reset the assembly state for a new response. */
void elm_rx_reset(elm_rx_t *r);

/**
 * @brief Append a notification fragment to the current response.
 * @return true when the terminating '>' prompt has arrived.
 */
bool elm_rx_feed(elm_rx_t *r, const uint8_t *data, size_t n);

/**
 * @brief Validate a complete ELM327 reply and its response type.
 * @param is_reset An ATZ reply may contain a banner instead of OK.
 * @param is_at_command For ordinary AT commands, require a line containing OK.
 */
bool elm_reply_valid(const char *reply, bool is_reset, bool is_at_command);

/** Classify ECU health from data and ELM status text. */
ivts_ecu_state_t elm_reply_ecu_state(const char *reply);

/**
 * @brief Extract payload bytes for the requested OBD service.
 *
 * Ignore echo, SEARCHING text, ISO-TP length-only lines, frame indices, and
 * whitespace. The first matching response supplies the payload.
 *
 * @param mode Requested service, for example 0x01.
 * @param[out] out Destination byte array.
 * @param cap Capacity of out in bytes.
 * @param[out] n Number of bytes written.
 * @retval IVTS_OK A matching payload was decoded.
 * @retval IVTS_ERR_NOT_FOUND No reply matched the service.
 */
ivts_err_t elm_extract_bytes(const char *reply, uint8_t mode, uint8_t *out, size_t cap, size_t *n);

/**
 * @brief Decode OBD-II service 01, 03, 07 and 0A payload bytes.
 *
 * The parsers use caller-owned buffers with no BLE state. PID conversions
 * follow SAE J1979.
 */

/**
 * @brief Decode one supported service 01 PID.
 * @param b Reply bytes beginning with [0x41, pid].
 * @param[in,out] s Sample to update and mark valid for the decoded field.
 * @retval IVTS_OK The PID was decoded.
 * @retval IVTS_ERR_NOT_FOUND The PID is unsupported.
 * @retval IVTS_ERR_INVALID_ARG Missing input or too few bytes.
 */
ivts_err_t obd_pid_decode(const uint8_t *b, size_t n, ivts_obd_sample_t *s);

/**
 * @brief Decode readiness from service 01 PID 0x01.
 * @param b Reply bytes [0x41, 0x01, A, B, C, D].
 */
ivts_err_t obd_readiness_decode(const uint8_t *b, size_t n, ivts_obd_readiness_t *r);

/**
 * @brief Decode stored, pending or permanent trouble codes from service 03, 07 or 0A.
 * @param b Reply prefix 0x43, 0x47 or 0x4A, then an optional CAN count and two
 * bytes per trouble code.
 */
ivts_err_t obd_dtc_decode(const uint8_t *b, size_t n, ivts_dtc_list_t *d);

/**
 * @brief Format a two-byte code, such as 0x01 0x33 as "P0133".
 * @param[out] out IVTS_DTC_CODE_SIZE-byte buffer including the trailing NUL.
 */
void obd_dtc_format(uint8_t hi, uint8_t lo, char out[IVTS_DTC_CODE_SIZE]);

typedef struct {
    bool is_synced;
    bool is_connected;
    bool is_ecu_ready;
    uint16_t connection;
    uint16_t rx_handle;
    uint16_t tx_handle;
    elm_rx_t reply;
} obd_session_t;

/* OBD task. Run scan, connect, discovery and the ELM initialization sequence. */
bool obd_session_setup(obd_session_t *session);
bool obd_session_command(obd_session_t *session, const char *command, uint32_t timeout_ms);
void obd_session_emit_link(bool connected, bool elm_ready, ivts_ecu_state_t ecu);

/* OBD task. Discover the service and characteristics and enable RX notifications. */
bool obd_discovery_configure(obd_session_t *session);

#define OBD_BLE_WAIT_ANY  0xffu
#define OBD_BLE_WAIT_NONE 0xfeu

/* Lifecycle and flags shared with the app task. */
int obd_task_start(void);
ivts_err_t obd_task_set_enabled(bool enabled);
bool obd_task_is_enabled(void);
/* Nonblocking post from the NimBLE host; only the OBD task receives. */
bool obd_task_post(const obd_ble_event_t *event);
bool obd_task_wait_event(obd_session_t *session, uint8_t want, uint32_t timeout_ms, obd_ble_event_t *out);

/* Create the copy mutex before starting the OBD task. */
bool obd_diag_init(void);
/* OBD task. Read readiness and DTCs, then publish the completed snapshot. */
bool obd_diag_poll(obd_session_t *session);

/* OBD task. Probe the ECU and publish one round of decoded live PIDs. */
bool obd_poll_sample(obd_session_t *session);
