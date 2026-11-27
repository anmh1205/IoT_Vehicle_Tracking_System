#pragma once
#include <stdbool.h>
#include <stdint.h>

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
