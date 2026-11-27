#pragma once
#include <stdbool.h>
#include <stdint.h>

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
