/**
 * @file fsm.h
 * @brief FSM ứng dụng: quyết định hành động theo ignition, motion, kết nối và hàng đợi.
 *
 * Thuần: ivts_fsm_step() không I/O và không đọc clock; mọi đầu vào nằm trong
 * ivts_fsm_in_t, mọi quyết định trả về trong ivts_fsm_out_t. App thực thi các
 * hành động trong ivts_fsm_out_t.
 */
#pragma once
#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/time.h"
#include "ivts_core/fsm/state.h"
#include "ivts_core/model/telemetry.h"

/** Nguyên nhân của chu kỳ thức hiện tại. */
typedef enum { IVTS_WAKE_POWER_ON = 0, IVTS_WAKE_TIMER, IVTS_WAKE_MOTION, IVTS_WAKE_OTHER } ivts_wake_t;

/** Tham số FSM, dẫn xuất từ config và board. */
typedef struct {
    uint32_t tracking_ms;        /**< Chu kỳ gửi RAW khi DRIVING. */
    uint32_t alarm_ms;           /**< Chu kỳ gửi RAW khi ALARM. */
    uint32_t alarm_timeout_ms;   /**< Thời gian yên lặng cần có để thoát ALARM. */
    uint32_t heartbeat_s;        /**< Thời gian ngủ giữa hai lần thức theo timer. */
    uint32_t status_ms;          /**< Chu kỳ gửi status khi DRIVING. */
    uint32_t check_ign_max_ms;   /**< Ignition vẫn UNKNOWN sau khoảng này thì coi là OFF. */
    uint32_t parked_settle_ms;   /**< Thời gian tối thiểu ở PARKED trước khi được ngủ. */
    uint32_t awake_max_ms;       /**< Thời gian thức tối đa ở HEARTBEAT/PARKED, kể cả khi chưa gửi xong. */
    bool     sleep_enabled;      /**< false: dùng fake sleep (không tắt phần cứng). */
    bool     imu_wakeup_enabled; /**< Cho phép IMU đánh thức. */
    bool     deep_wake_on_motion;/**< Chân INT của IMU có khả năng đánh thức deep sleep. */
} ivts_fsm_cfg_t;

/** Đầu vào của một bước FSM. */
typedef struct {
    ivts_ms_t       now;
    ivts_ignition_t ignition;
    ivts_motion_t   motion;
    ivts_wake_t     wake;          /**< Chỉ có ý nghĩa ở bước đầu sau boot hoặc sau light sleep. */
    bool            link_up;       /**< Đã kết nối broker. */
    bool            link_expected; /**< Đã provision; chờ broker tới hết cửa sổ thức. */
    bool            publish_idle;  /**< Không có bản tin nào đang chờ ACK. */
    bool            control_pending; /**< Còn bản tin điều khiển chưa gửi. */
    uint32_t        offline_record_count; /**< Số record offline chưa gửi. */
    bool            ota_active;    /**< OTA đang chạy hoặc đang chờ confirm: cấm ngủ. */
} ivts_fsm_in_t;

#define IVTS_ACT_PUBLISH_RAW    (1u << 0)  /**< Gửi một bản tin RAW. */
#define IVTS_ACT_PUBLISH_STATUS (1u << 1)  /**< Gửi một bản tin status. */
#define IVTS_ACT_GNSS_ON        (1u << 2)
#define IVTS_ACT_GNSS_OFF       (1u << 3)
#define IVTS_ACT_OBD_START      (1u << 4)
#define IVTS_ACT_OBD_STOP       (1u << 5)
#define IVTS_ACT_SLEEP          (1u << 6)  /**< Vào chế độ ngủ theo sleep_mode/sleep_s/sleep_arm_motion. */
#define IVTS_ACT_REPLAY         (1u << 7)  /**< Gửi bản ghi offline; app tự chặn yêu cầu trùng. */

/** Kết quả của một bước FSM. */
typedef struct {
    uint32_t          actions;          /**< Tổ hợp IVTS_ACT_*. */
    ivts_sleep_mode_t sleep_mode;       /**< Hợp lệ khi có IVTS_ACT_SLEEP. */
    uint32_t          sleep_s;          /**< Hợp lệ khi có IVTS_ACT_SLEEP. */
    bool              sleep_arm_motion; /**< Hợp lệ khi có IVTS_ACT_SLEEP. */
    bool              changed;          /**< State đổi trong bước này. */
} ivts_fsm_out_t;

typedef struct {
    ivts_fsm_state_t state;
    ivts_ms_t        entered_ms;      /**< Thời điểm vào state hiện tại. */
    ivts_ms_t        last_raw_ms;     /**< Lần gửi RAW gần nhất; 0 = chưa gửi trong state này. */
    ivts_ms_t        last_status_ms;
    bool             status_sent;     /**< Đã gửi status trong state này. */
    ivts_wake_t      wake;            /**< Nguyên nhân thức của chu kỳ hiện tại. */
    ivts_sleep_mode_t sleep_mode;      /**< Chế độ đã chọn khi vào IVTS_ST_SLEEP. */
} ivts_fsm_t;

/** @brief Khởi tạo FSM ở state INIT. */
void ivts_fsm_init(ivts_fsm_t *f, ivts_ms_t now, ivts_wake_t wake);

/**
 * @brief Chạy một bước FSM.
 * @param f    State của FSM, được cập nhật.
 * @param c    Tham số.
 * @param in   Đầu vào.
 * @param out  Nhận hành động cần thực thi; được xoá trước khi ghi.
 */
void ivts_fsm_step(ivts_fsm_t *f, const ivts_fsm_cfg_t *c, const ivts_fsm_in_t *in, ivts_fsm_out_t *out);

/**
 * @brief Báo FSM vừa thức dậy: quay về CHECK_IGN với nguyên nhân thức mới.
 */
void ivts_fsm_woke(ivts_fsm_t *f, ivts_ms_t now, ivts_wake_t wake);

/** @brief Ánh xạ state của app sang trạng thái thiết bị gửi cloud. */
ivts_device_state_t ivts_fsm_device_state(ivts_fsm_state_t s);
