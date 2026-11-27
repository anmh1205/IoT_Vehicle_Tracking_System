#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/model/gnss.h"
#include "ivts_core/model/obd.h"

/** Trạng thái ignition. */
typedef enum { IVTS_IGN_UNKNOWN = 0, IVTS_IGN_OFF, IVTS_IGN_ON } ivts_ignition_t;
/** Trạng thái chuyển động theo IMU. */
typedef enum { IVTS_MOTION_UNKNOWN = 0, IVTS_MOTION_STATIONARY, IVTS_MOTION_MOVING } ivts_motion_t;

/** Trạng thái xe: tổ hợp ignition và motion. */
typedef enum {
    IVTS_VEH_UNKNOWN = 0,
    IVTS_VEH_PARKED_OFF,
    IVTS_VEH_ROLLING_IGN_OFF,
    IVTS_VEH_IDLING_ON,
    IVTS_VEH_MOVING_ON,
    IVTS_VEH_UNKNOWN_STATIONARY,
    IVTS_VEH_UNKNOWN_MOVING
} ivts_vehicle_t;

/** Trạng thái thiết bị gửi cloud. Khác ivts_app_state_t của FSM. */
typedef enum {
    IVTS_DEV_BOOTING = 0,
    IVTS_DEV_ACTIVE,
    IVTS_DEV_SLEEP_PREPARE,
    IVTS_DEV_SLEEPING,
    IVTS_DEV_WAKING,
    IVTS_DEV_ALARM,
    IVTS_DEV_OTA,
    IVTS_DEV_FAULT
} ivts_device_state_t;

/** Chế độ ngủ. FAKE: không tắt phần cứng, chỉ hành xử như đang ngủ. */
typedef enum { IVTS_SLEEP_NONE = 0, IVTS_SLEEP_FAKE, IVTS_SLEEP_LIGHT, IVTS_SLEEP_DEEP } ivts_sleep_mode_t;

/** Trạng thái ECU quan sát qua ELM327. */
typedef enum {
    IVTS_ECU_UNKNOWN = 0,
    IVTS_ECU_DISCONNECTED,
    IVTS_ECU_LIVE,
    IVTS_ECU_STOPPED,
    IVTS_ECU_NO_DATA
} ivts_ecu_state_t;

/**
 * Ảnh chụp trạng thái thiết bị. Chỉ app_state.c được ghi (writer duy nhất);
 * payload được dựng từ ảnh này trong task app.
 */
typedef struct {
    ivts_gnss_t          gnss;
    ivts_obd_sample_t    obd;
    ivts_obd_readiness_t obd_readiness;
    ivts_dtc_list_t      dtc_stored, dtc_pending, dtc_permanent;
    uint32_t imu_accel_delta_mmps2;   /**< Độ lệch gia tốc (mm/s^2). */
    uint32_t obd_sample_age_ms;
    uint32_t obd_connect_fail_5m;
    int32_t  error_code;
    uint16_t vehicle_mv;
    uint16_t device_mv;
    ivts_ignition_t     ignition;
    ivts_motion_t       motion;
    ivts_vehicle_t      vehicle;
    ivts_device_state_t device_state;
    ivts_sleep_mode_t   sleep_mode;
    ivts_ecu_state_t    obd_ecu_state;
    bool obd_ble_connected;
    bool obd_elm_ready;
} ivts_telemetry_t;
