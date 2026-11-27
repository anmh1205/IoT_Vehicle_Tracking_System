/**
 * @file state.h
 * @brief State của FSM ứng dụng.
 */
#pragma once

/** State của app. Khác ivts_device_state_t, là trạng thái gửi cloud. */
typedef enum {
    IVTS_ST_INIT = 0,
    IVTS_ST_CHECK_IGN,   /**< Chờ ignition có giá trị rõ ràng sau boot hoặc sau khi thức. */
    IVTS_ST_DRIVING,     /**< Ignition ON: gửi telemetry đầy đủ. */
    IVTS_ST_PARKED,      /**< Ignition OFF: chờ đủ điều kiện để ngủ. */
    IVTS_ST_ALARM,       /**< Xe chuyển động khi ignition OFF. */
    IVTS_ST_HEARTBEAT,   /**< Thức theo timer: gửi status rồi ngủ lại. */
    IVTS_ST_SLEEP,       /**< Đã phát lệnh ngủ; chờ wake (light/fake) hoặc không quay lại (deep). */
    IVTS_ST_COUNT
} ivts_fsm_state_t;

/** @brief Tên chuỗi của state. Không bao giờ NULL. */
const char *ivts_fsm_state_name(ivts_fsm_state_t s);
