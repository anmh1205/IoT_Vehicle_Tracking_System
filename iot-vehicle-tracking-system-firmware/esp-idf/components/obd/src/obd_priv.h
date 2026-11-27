#pragma once

/**
 * @file obd_priv.h
 * @brief Khai báo nội bộ của component obd: sự kiện BLE giữa host task NimBLE và task "obd",
 *        giao diện của obd_ble.c và obd_os.c.
 */

#include <stdbool.h>
#include <stdint.h>
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "obd/obd.h"

#define OBD_TAG "obd"

/**
 * Loại sự kiện gửi từ callback NimBLE (chạy trong host task của stack) và từ obd_start/obd_stop
 * tới task "obd". Callback chỉ sao chép dữ liệu vào bev_t rồi trả về: không chờ, không gọi API
 * GATT đồng bộ, không gọi sink của app.
 */
typedef enum {
    BEV_SYNCED = 0,     /**< Host NimBLE đã đồng bộ với controller. */
    BEV_ADV,            /**< Nhận một gói quảng bá khi quét. */
    BEV_SCAN_DONE,      /**< Quét kết thúc. */
    BEV_CONNECTED,      /**< Kết quả kết nối (status, conn). */
    BEV_DISCONNECTED,   /**< Mất kết nối. */
    BEV_SVC,            /**< Một service tìm thấy (h_start, h_end). */
    BEV_CHR,            /**< Một characteristic tìm thấy (uuid16, h_end = value handle). */
    BEV_DSC,            /**< Một descriptor tìm thấy (uuid16, h_start = handle). */
    BEV_DISC_DONE,      /**< Kết thúc một lượt discovery. */
    BEV_WRITE_DONE,     /**< Kết quả một lệnh ghi GATT. */
    BEV_NOTIFY,         /**< Một mảnh phản hồi ELM327 qua notification. */
    BEV_CTRL_CHANGED    /**< Đánh thức task sau obd_start() hoặc obd_stop(). */
} bev_type_t;

/** Một sự kiện BLE, sao chép theo giá trị vào queue của task "obd". */
typedef struct {
    uint8_t  type;            /**< bev_type_t. */
    int16_t  status;          /**< 0 = thành công; khác 0 là mã lỗi NimBLE. */
    uint16_t conn;            /**< Connection handle. */
    uint16_t h_start, h_end;  /**< SVC: dải handle; CHR: handle khai báo và handle giá trị; DSC: handle. */
    uint16_t uuid16;          /**< UUID 16 bit của characteristic hoặc descriptor. */
    uint8_t  addr[7];         /**< ADV: loại địa chỉ rồi 6 byte địa chỉ. */
    uint8_t  len;             /**< Số byte hợp lệ trong data. */
    uint8_t  data[UINT8_MAX]; /**< NOTIFY: một mảnh phản hồi của ELM327 (ATT MTU cấu hình 256). */
} bev_t;

extern obd_cfg_t g_obd_cfg;                 /**< Cấu hình; ghi một lần trong obd_init(). */
extern SemaphoreHandle_t g_obd_diag_mx;     /**< Mutex bảo vệ g_obd_rd và g_obd_dtc. */
extern ivts_obd_readiness_t g_obd_rd;       /**< Readiness mới nhất; ghi bởi task "obd" dưới g_obd_diag_mx. */
extern ivts_dtc_list_t g_obd_dtc[3];        /**< DTC stored, pending, permanent; cùng khoá với g_obd_rd. */

/**
 * @brief Đưa sự kiện vào queue của task "obd" mà không chờ.
 * @return false nếu queue chưa tạo hoặc đã đầy (sự kiện bị bỏ).
 * @note Gọi được từ host task NimBLE và từ task bất kỳ; không gọi từ ISR.
 */
bool obd_post(const bev_t *e);

/* ---- obd_ble.c: lớp NimBLE; hàm trả 0 nếu thành công, mã lỗi NimBLE nếu thất bại ---- */

int  obd_ble_init(void);                                                   /**< Khởi tạo NimBLE và đăng ký callback. */
int  obd_ble_deinit(void);                                                 /**< Dừng host và tắt controller NimBLE. */
int  obd_ble_scan(void);                                                   /**< Bắt đầu quét; mỗi gói thành BEV_ADV. */
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

/* ---- obd_os.c ---- */

/** Tạo queue, mutex và task "obd". @return 0 nếu thành công, -1 nếu thất bại. */
int obd_os_start(void);
ivts_err_t obd_os_set_enabled(bool enabled);
