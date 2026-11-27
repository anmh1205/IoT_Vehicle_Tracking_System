/**
 * @file event.h
 * @brief Sự kiện giữa các component và cơ chế sink.
 *
 * Mọi component I/O (board, modem, obd, storage, ota) báo kết quả cho app bằng
 * ivts_event_t qua một ivts_sink_t. Event được copy theo giá trị và không mang
 * con trỏ; dữ liệu lớn (command, readiness/DTC) nằm ở "ô" của component nguồn
 * và event chỉ báo là đã sẵn sàng.
 */
#pragma once
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/base/time.h"
#include "ivts_core/model/gnss.h"
#include "ivts_core/model/obd.h"

/** Kích thước tối đa của một event; cũng là kích thước một phần tử queue của app. */
#define IVTS_EVENT_MAX_SIZE 64u

typedef enum {
    IVTS_EV_NONE = 0,
    IVTS_EV_LINK_STATE,      /**< modem: trạng thái mạng / broker thay đổi. */
    IVTS_EV_GNSS_FIX,        /**< modem: một mẫu GNSS. */
    IVTS_EV_MQTT_ACK,        /**< modem: kết quả publish QoS1. */
    IVTS_EV_CMD_PENDING,     /**< modem: ô command có dữ liệu mới. */
    IVTS_EV_STORE_RESULT,    /**< storage: một yêu cầu thất bại. */
    IVTS_EV_QUEUE_READY,     /**< storage: ô peek của offline queue đã nạp bản ghi. */
    IVTS_EV_CONFIG_CORRUPT,  /**< storage: blob config hỏng, đã thay bằng giá trị mặc định. */
    IVTS_EV_OBD_LINK,        /**< obd: trạng thái BLE/ELM327/ECU thay đổi. */
    IVTS_EV_OBD_SAMPLE,      /**< obd: một mẫu PID. */
    IVTS_EV_OBD_DIAG_READY,  /**< obd: readiness/DTC mới, lấy bằng obd_diag_copy(). */
    IVTS_EV_POWER_SAMPLE,    /**< board: điện áp nguồn xe và nguồn thiết bị (mV). */
    IVTS_EV_MOTION_IRQ,      /**< board: IMU phát hiện chuyển động. */
    IVTS_EV_OTA_PROGRESS,    /**< ota: tiến độ hoặc kết quả. */
    IVTS_EV_COUNT
} ivts_event_type_t;

/** Mức kết nối của modem. */
typedef enum { IVTS_LINK_DOWN = 0, IVTS_LINK_NET_UP, IVTS_LINK_BROKER_UP } ivts_link_t;

/** Loại yêu cầu storage trong IVTS_EV_STORE_RESULT. */
typedef enum {
    IVTS_STORE_OP_CONFIG_SAVE = 0,
    IVTS_STORE_OP_LOG_APPEND,
    IVTS_STORE_OP_QUEUE_PUSH,
    IVTS_STORE_OP_QUEUE_POP,
    IVTS_STORE_OP_SD_MOUNT,
    IVTS_STORE_OP_QUEUE_PEEK
} ivts_store_op_t;

/** Cảnh báo chuyển động chưa có PUBACK. seq = 0 nghĩa là không có cảnh báo. */
typedef struct {
    uint64_t unix_ms;
    uint32_t uptime_ms;
    uint32_t boot_id;
    uint32_t seq;
} ivts_motion_alarm_t;

typedef struct {
    uint8_t   type;      /**< ivts_event_type_t. */
    ivts_ms_t ts_ms;     /**< Uptime lúc event được tạo. */
    union {
        struct { uint8_t link; int32_t err; }                  link_state;
        ivts_gnss_t                                            gnss;
        struct { uint32_t tx_id; uint8_t ok; int16_t err; }    mqtt_ack;
        struct { uint16_t len; }                               cmd_pending;
        struct { uint8_t op; int32_t err; }                    store_result;
        struct { uint32_t pending; }                           queue_ready;
        struct { int32_t err; }                                config_corrupt;
        struct { uint8_t connected; uint8_t elm_ready; uint8_t ecu; } obd_link;
        ivts_obd_sample_t                                      obd_sample;
        struct { uint16_t vehicle_mv; uint16_t device_mv; uint32_t imu_delta_mmps2; } power;
        struct { uint8_t pin_level; uint32_t imu_delta_mmps2; } motion_irq;
        struct { uint8_t phase; uint8_t pct; int32_t err; }    ota_progress;
    } u;
} ivts_event_t;

_Static_assert(sizeof(ivts_event_t) <= IVTS_EVENT_MAX_SIZE,
               "ivts_event_t vuot IVTS_EVENT_MAX_SIZE");

/**
 * @brief Hàm nhận event của app.
 *
 * Không chặn: copy event vào queue của app rồi trả về ngay. Chỉ gọi từ task.
 * Không gọi từ ISR; không gọi từ callback của stack (ví dụ NimBLE) khi callback
 * đó đang giữ lock của stack.
 *
 * @return IVTS_OK; IVTS_ERR_FULL nếu queue đầy (event bị bỏ).
 */
typedef ivts_err_t (*ivts_sink_fn)(void *ctx, const ivts_event_t *ev);

/** Đích nhận event: hàm và ngữ cảnh của nó. */
typedef struct {
    ivts_sink_fn fn;
    void *ctx;
} ivts_sink_t;

/**
 * @brief Phát một event tới sink.
 * @return Kết quả của sink; IVTS_ERR_INVALID_ARG nếu s, s->fn hoặc ev là NULL.
 */
static inline ivts_err_t ivts_sink_emit(const ivts_sink_t *s, const ivts_event_t *ev)
{
    if (s == NULL || s->fn == NULL || ev == NULL) {
        return IVTS_ERR_INVALID_ARG;
    }
    return s->fn(s->ctx, ev);
}

/** @brief Tên chuỗi của loại event. Không bao giờ NULL. */
const char *ivts_event_name(ivts_event_type_t t);
