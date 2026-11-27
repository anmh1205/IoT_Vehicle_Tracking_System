#pragma once

/**
 * @file obd.h
 * @brief Giao diện công khai của component OBD: kết nối ELM327 qua BLE (NimBLE central) và đọc PID,
 *        trạng thái sẵn sàng và mã lỗi DTC.
 *
 * Mọi thao tác BLE và ELM327 chạy trong task "obd". Các hàm điều khiển trong header này không
 * chặn; kết quả quay về qua sink dưới dạng IVTS_EV_OBD_LINK, IVTS_EV_OBD_SAMPLE và
 * IVTS_EV_OBD_DIAG_READY.
 */

#include <stdbool.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/event/event.h"
#include "ivts_core/model/obd.h"

/** Cấu hình OBD; obd_init() sao chép toàn bộ. */
typedef struct {
    ivts_sink_t sink;              /**< Nơi nhận sự kiện OBD. */
    char        target_addr[18];   /**< Địa chỉ BLE đích dạng "AA:BB:CC:DD:EE:FF"; rỗng = chọn thiết bị
                                        quảng bá service 0x18F0 hoặc tên OBD tương thích. */
    uint16_t    poll_ms;           /**< Chu kỳ một vòng PID 0C/0D/05/04/2F (mili-giây). */
    uint16_t    diag_period_s;     /**< Chu kỳ đọc readiness (0101) và DTC (03/07/0A), giây. */
    uint8_t     task_prio;         /**< Priority của task "obd". */
    uint32_t    task_stack;        /**< Stack của task "obd", byte. */
} obd_cfg_t;

/**
 * @brief Khởi tạo queue và task "obd".
 *
 * Phải gọi sau storage_init() để NVS sẵn sàng khi obd_start() khởi tạo NimBLE.
 *
 * @retval IVTS_OK              Đã khởi tạo.
 * @retval IVTS_ERR_INVALID_ARG cfg hoặc sink NULL.
 * @retval IVTS_ERR_FULL        Không tạo được queue, mutex hoặc task.
 */
ivts_err_t obd_init(const obd_cfg_t *cfg);

/**
 * @brief Yêu cầu bật NimBLE, quét, kết nối và đọc dữ liệu. Trả về ngay.
 * @retval IVTS_ERR_INVALID_STATE Chưa khởi tạo OBD.
 */
ivts_err_t obd_start(void);

/**
 * @brief Yêu cầu ngắt kết nối, dừng đọc và tắt NimBLE. Trả về ngay.
 * @retval IVTS_ERR_INVALID_STATE Chưa khởi tạo OBD.
 */
ivts_err_t obd_stop(void);

/** @return true nếu đã tắt BLE. Gọi sau obd_stop() để kiểm tra trước khi ngủ. */
bool obd_is_stopped(void);

/**
 * @brief Sao chép readiness và DTC mới nhất.
 *
 * Gọi sau khi nhận IVTS_EV_OBD_DIAG_READY. Tham số nào NULL thì bỏ qua. Hàm khoá mutex trong lúc
 * sao chép nên an toàn gọi từ task bất kỳ.
 *
 * @retval IVTS_OK                Đã sao chép.
 * @retval IVTS_ERR_INVALID_STATE obd_init() chưa chạy.
 */
ivts_err_t obd_diag_copy(ivts_obd_readiness_t *rd, ivts_dtc_list_t *stored,
                         ivts_dtc_list_t *pending, ivts_dtc_list_t *permanent);
