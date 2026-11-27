#pragma once
#include <stdbool.h>
#include <stdint.h>

/** Bit trong valid_mask. 0 là giá trị hợp lệ của rpm/speed/load nên không thể dùng 0 để biểu diễn "không có". */
#define IVTS_OBD_HAS_RPM      (1u << 0)
#define IVTS_OBD_HAS_SPEED    (1u << 1)
#define IVTS_OBD_HAS_COOLANT  (1u << 2)
#define IVTS_OBD_HAS_FUEL     (1u << 3)
#define IVTS_OBD_HAS_LOAD     (1u << 4)

/** Một mẫu PID. Chỉ các trường có bit tương ứng trong valid_mask mới có giá trị. */
typedef struct {
    uint16_t rpm;        /**< PID 0x0C. */
    int16_t  coolant_c;  /**< PID 0x05, nhiệt độ nước làm mát (°C). */
    uint8_t  valid_mask; /**< Tổ hợp IVTS_OBD_HAS_*. */
    uint8_t  speed_kmh;  /**< PID 0x0D. */
    uint8_t  fuel_pct;   /**< PID 0x2F, 0..100. */
    uint8_t  load_pct;   /**< PID 0x04, 0..100. */
} ivts_obd_sample_t;

/** Trạng thái một monitor của readiness (PID 0x01). */

typedef enum {
    IVTS_MON_UNKNOWN = 0,
    IVTS_MON_COMPLETE,
    IVTS_MON_INCOMPLETE,
    IVTS_MON_UNSUPPORTED
} ivts_monitor_status_t;

typedef struct {
    bool    valid;               /**< PID 0x0101 đã được giải mã ít nhất một lần. */
    bool    mil_on;
    bool    compression_ignition;
    uint8_t reported_dtc_count;
    /* Monitor chung cho động cơ xăng và diesel. */
    ivts_monitor_status_t misfire, fuel_system, comprehensive_components;
    /* Chỉ động cơ đánh lửa cưỡng bức (xăng). */
    ivts_monitor_status_t catalyst, heated_catalyst, evaporative_system,
                          secondary_air_system, ac_refrigerant, oxygen_sensor,
                          oxygen_sensor_heater, egr_vvt_system;
    /* Chỉ động cơ nén cháy (diesel). */
    ivts_monitor_status_t nmhc_catalyst, nox_aftertreatment, boost_pressure,
                          exhaust_gas_sensor, pm_filter;
} ivts_obd_readiness_t;

#define IVTS_DTC_MAX_CODES  8u   /**< Số mã DTC tối đa lưu cho mỗi loại. */
#define IVTS_DTC_CODE_SIZE  6u   /**< "P0171" + NUL. */

/** Danh sách mã lỗi (DTC) của một loại: stored, pending hoặc permanent. */

typedef struct {
    bool    valid;       /**< Đã truy vấn thành công, hoặc xe báo không có mã. */
    bool    truncated;   /**< Xe báo nhiều hơn IVTS_DTC_MAX_CODES mã. */
    uint8_t count;
    char    codes[IVTS_DTC_MAX_CODES][IVTS_DTC_CODE_SIZE];
} ivts_dtc_list_t;
