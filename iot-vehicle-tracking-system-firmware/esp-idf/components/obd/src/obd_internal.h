#pragma once
#include "obd/obd.h"
#include <stdbool.h>
#include <stdint.h>
#include <stddef.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/telemetry.h"
#include "ivts_core/model/obd.h"

#define OBD_TAG "obd"

/* Configuration is set at boot and read by the OBD task and BLE callbacks. */
const obd_cfg_t *obd_config(void);
void obd_emit(const ivts_event_t *event);

#define OBD_SERVICE_UUID 0x18F0u

/* The OBD task initiates NimBLE operations; callbacks post events. */
int  obd_ble_init(void);                                                   /**< Khởi tạo NimBLE và đăng ký callback. */
int  obd_ble_deinit(void);                                                 /**< Dừng host và tắt controller NimBLE. */
int  obd_ble_scan(void);                                                   /**< Bắt đầu quét; mỗi gói thành OBD_BLE_EV_ADV. */
void obd_ble_scan_stop(void);                                              /**< Dừng quét. */
int  obd_ble_connect(const uint8_t addr[7]);                               /**< Kết nối tới địa chỉ (loại + 6 byte). */
int  obd_ble_disc_svc(uint16_t conn);                                      /**< Tìm service. */
int  obd_ble_disc_chrs(uint16_t conn, uint16_t start, uint16_t end);       /**< Tìm characteristic trong dải handle. */
int  obd_ble_disc_dscs(uint16_t conn, uint16_t value_handle, uint16_t end); /**< Tìm descriptor sau value handle. */
int  obd_ble_enable_notify(uint16_t conn, uint16_t cccd);                  /**< Bật notification qua CCCD. */
int  obd_ble_write(uint16_t conn, uint16_t handle, const char *s);         /**< Ghi chuỗi tới characteristic TX. */
void obd_ble_disconnect(uint16_t conn);                                    /**< Ngắt kết nối. */
/** @return true nếu @p addr khớp @p want (chuỗi "AA:BB:..."), hoặc @p want rỗng. */
bool obd_ble_addr_matches(const uint8_t addr[7], const char *want);

uint8_t obd_ble_own_addr_type(void);

typedef enum {
    OBD_BLE_EV_SYNCED = 0,     /**< Host NimBLE đã đồng bộ với controller. */
    OBD_BLE_EV_ADV,            /**< Nhận một gói quảng bá khi quét. */
    OBD_BLE_EV_SCAN_DONE,      /**< Quét kết thúc. */
    OBD_BLE_EV_CONNECTED,      /**< Kết quả kết nối (status, conn). */
    OBD_BLE_EV_DISCONNECTED,   /**< Mất kết nối. */
    OBD_BLE_EV_SVC,            /**< Một service tìm thấy (h_start, h_end). */
    OBD_BLE_EV_CHR,            /**< Một characteristic tìm thấy (uuid16, value_handle). */
    OBD_BLE_EV_DSC,            /**< Một descriptor tìm thấy (uuid16, h_start = handle). */
    OBD_BLE_EV_DISC_DONE,      /**< Kết thúc một lượt discovery. */
    OBD_BLE_EV_WRITE_DONE,     /**< Kết quả một lệnh ghi GATT. */
    OBD_BLE_EV_NOTIFY,         /**< Một mảnh phản hồi ELM327 qua notification. */
    OBD_BLE_EV_CTRL_CHANGED    /**< Đánh thức task sau obd_start() hoặc obd_stop(). */
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
 * @file elm327.h
 * @brief Giao thức văn bản của adapter ELM327: ghép phản hồi, kiểm tra hợp lệ, tách byte dữ liệu.
 *
 * Module thuần C, không có trạng thái toàn cục; kiểm thử được trên host. Một phản hồi kết thúc
 * bằng prompt '>'.
 */

#define ELM_REPLY_MAX 512u   /**< Dung lượng bộ đệm một phản hồi (gồm NUL). */

/** Một bước của chuỗi khởi tạo adapter. */
typedef struct {
    const char *cmd;          /**< Lệnh AT gửi (không gồm "\r"). */
    uint32_t    timeout_ms;   /**< Thời gian chờ phản hồi; ATZ dài nhất vì adapter khởi động lại. */
    bool        is_reset;     /**< Lệnh reset: phản hồi có chuỗi banner thay vì chỉ "OK". */
} elm_init_step_t;

extern const elm_init_step_t ELM_INIT_SEQ[];   /**< Chuỗi khởi tạo theo thứ tự thực hiện. */
extern const size_t ELM_INIT_SEQ_LEN;          /**< Số bước của ELM_INIT_SEQ. */

/** Bộ ghép phản hồi từ các mảnh notification BLE. */
typedef struct {
    char   buf[ELM_REPLY_MAX];   /**< Nội dung đã nhận, kết thúc bằng NUL. */
    size_t len;                  /**< Số byte trong buf. */
    bool   complete;             /**< Đã thấy prompt '>': phản hồi trọn vẹn. */
    bool   overflow;             /**< Phản hồi dài hơn bộ đệm; phần thừa bị bỏ. */
} elm_rx_t;

/** Xoá bộ ghép để nhận phản hồi mới. */
void elm_rx_reset(elm_rx_t *r);

/**
 * @brief Nối một mảnh notification vào bộ ghép.
 * @return true khi phản hồi đã trọn vẹn (đã thấy '>').
 */
bool elm_rx_feed(elm_rx_t *r, const uint8_t *data, size_t n);

/**
 * @brief Kiểm tra phản hồi hợp lệ: có prompt và không chứa lỗi đã biết.
 * @param is_reset         Phản hồi của lệnh reset (ATZ); không yêu cầu "OK".
 * @param is_at_command    Phản hồi của lệnh AT (không phải PID); yêu cầu có dòng "OK".
 */
bool elm_reply_valid(const char *reply, bool is_reset, bool is_at_command);

/** Phân loại trạng thái ECU từ phản hồi: có dữ liệu, đã dừng, không có dữ liệu hoặc không rõ. */
ivts_ecu_state_t elm_reply_ecu_state(const char *reply);

/**
 * @brief Lấy các byte dữ liệu của phản hồi cho service @p mode (ví dụ 0x01).
 *
 * Bỏ echo, "SEARCHING...", dòng đếm byte ISO-TP (ví dụ "00A"), tiền tố khung ("0:") và khoảng
 * trắng. Các byte ghi ra bắt đầu từ byte mode + 0x40. Khi nhiều ECU cùng trả lời, chỉ dùng dòng
 * khớp đầu tiên.
 *
 * @param[out] out Bộ đệm nhận byte; @p cap là dung lượng.
 * @param[out] n   Số byte ghi vào out.
 * @retval IVTS_OK         Đã tách được dữ liệu.
 * @retval IVTS_ERR_NOT_FOUND Không có dòng nào khớp.
 */
ivts_err_t elm_extract_bytes(const char *reply, uint8_t mode, uint8_t *out, size_t cap, size_t *n);

/**
 * @file obd_pid.h
 * @brief Giải mã OBD-II service 01, 03, 07 và 0A từ dãy byte đã bỏ header.
 *
 * Module thuần C, không trạng thái; kiểm thử được trên host. Công thức theo SAE J1979
 * (tham chiếu: en.wikipedia.org/wiki/OBD-II_PIDs).
 */

/**
 * @brief Giải mã một PID service 01.
 * @param b Dữ liệu dạng [0x41, pid, A, B, ...].
 * @param[in,out] s Mẫu cần điền; giá trị giải mã được ghi vào đúng trường và bật bit tương ứng
 *                  trong valid_mask.
 * @retval IVTS_OK            Đã giải mã.
 * @retval IVTS_ERR_NOT_FOUND PID không được hỗ trợ.
 * @retval IVTS_ERR_INVALID_ARG Dữ liệu NULL hoặc không đủ byte.
 */
ivts_err_t obd_pid_decode(const uint8_t *b, size_t n, ivts_obd_sample_t *s);

/**
 * @brief Giải mã trạng thái sẵn sàng của các monitor (PID 0x01).
 * @param b Dữ liệu dạng [0x41, 0x01, A, B, C, D].
 */
ivts_err_t obd_readiness_decode(const uint8_t *b, size_t n, ivts_obd_readiness_t *r);

/**
 * @brief Giải mã danh sách DTC của service 03 (stored), 07 (pending) hoặc 0A (permanent).
 * @param b Dữ liệu dạng [0x43|0x47|0x4A, (số lượng trên CAN), hi, lo, hi, lo, ...].
 */
ivts_err_t obd_dtc_decode(const uint8_t *b, size_t n, ivts_dtc_list_t *d);

/**
 * @brief Định dạng một DTC hai byte thành chuỗi, ví dụ (0x01, 0x33) thành "P0133".
 * @param[out] out Bộ đệm IVTS_DTC_CODE_SIZE byte, kết thúc bằng NUL.
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
