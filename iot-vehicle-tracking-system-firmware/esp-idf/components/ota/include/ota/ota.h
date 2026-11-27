#pragma once

/**
 * @file ota.h
 * @brief Cập nhật firmware qua mạng: tải image, kiểm tra SHA-256, ghi vào partition kế tiếp và
 *        quản lý xác nhận hoặc rollback sau khi khởi động lại.
 *
 * Component không biết modem: nguồn byte được cấp qua ota_source_t. Việc tải chạy trong task "ota",
 * chỉ tồn tại khi đang tải. Tiến độ và kết quả báo qua IVTS_EV_OTA_PROGRESS.
 */

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/event/event.h"
#include "ivts_core/ota/contract.h"

/**
 * Nguồn byte của image. app_wiring.c nối các hàm modem_http_* vào cấu trúc này.
 * Các hàm được gọi từ task "ota" và được phép chặn.
 */
typedef struct {
    /** Mở @p url; ghi kích thước nội dung vào @p size và mã trạng thái HTTP vào @p http_status. */
    ivts_err_t (*open)(void *ctx, const char *url, uint32_t *size, int *http_status);
    /** Đọc tối đa @p len byte từ vị trí @p offset; ghi số byte đọc được vào @p got. */
    ivts_err_t (*read)(void *ctx, uint32_t offset, uint8_t *buf, size_t len, size_t *got);
    /** Đóng nguồn; gọi sau mỗi lần open, kể cả khi open thất bại. */
    void       (*close)(void *ctx);
    void       *ctx;    /**< Truyền lại cho open, read và close. */
} ota_source_t;

/** Cấu hình OTA; ota_init() sao chép toàn bộ. */
typedef struct {
    ivts_sink_t  sink;         /**< Nơi nhận IVTS_EV_OTA_PROGRESS. */
    ota_source_t src;          /**< Nguồn byte của image. */
    /** Task OTA lưu ngữ cảnh xác nhận qua cổng này trước khi đổi partition khởi động. */
    ivts_err_t (*prepare_boot)(const ivts_ota_cmd_t *cmd, const char *partition);
    uint8_t      task_prio;    /**< Priority của task "ota". */
    uint32_t     task_stack;   /**< Stack của task "ota", byte. */
} ota_cfg_t;

/**
 * @brief Lưu cấu hình OTA.
 * @retval IVTS_OK              Đã lưu.
 * @retval IVTS_ERR_INVALID_ARG cfg NULL hoặc thiếu open/read/close.
 */
ivts_err_t ota_init(const ota_cfg_t *cfg);

/**
 * @brief Sao chép lệnh và tạo task "ota" thực hiện tải.
 *
 * Tiến độ và kết quả báo qua IVTS_EV_OTA_PROGRESS{phase = ivts_ota_status_t, pct,
 * err = ivts_ota_err_t}. Pha IVTS_OTA_ST_REBOOTING nghĩa là partition khởi động đã được đặt:
 * ngữ cảnh xác nhận đã được lưu và app có thể khởi động lại.
 *
 * @param battery_mv     Điện áp nguồn hiện tại.
 * @param min_battery_mv Điện áp tối thiểu cho phép OTA; thấp hơn thì OTA thất bại.
 * @retval IVTS_OK                Task đã được tạo.
 * @retval IVTS_ERR_INVALID_ARG   cmd NULL.
 * @retval IVTS_ERR_INVALID_STATE Đang có OTA chạy.
 * @retval IVTS_ERR_FULL          Không tạo được task.
 */
ivts_err_t ota_start(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_battery_mv);

/** @return true nếu task "ota" đang chạy. Gọi được từ task bất kỳ. */
bool ota_running(void);
/** Lấy tiến độ mới nhất, kể cả khi queue sự kiện app từng đầy. Chỉ task app gọi. */
bool ota_progress_take(ivts_event_t *ev);

/**
 * @name Dùng lúc khởi động
 * Các hàm app dùng để xử lý trạng thái xác nhận image sau OTA.
 * @{
 */

/** @return true nếu image đang chạy ở trạng thái PENDING_VERIFY (vừa cài, chưa xác nhận). */
bool ota_image_pending_verify(void);

/** Xác nhận image đang chạy là hợp lệ và huỷ rollback. */
ivts_err_t ota_mark_valid(void);

/** Đánh dấu image đang chạy không hợp lệ và khởi động lại về partition cũ. Không trả về nếu thành công. */
ivts_err_t ota_rollback_and_reboot(void);
/** Có slot hợp lệ để quay về từ image OTA đang chạy. */
bool ota_can_rollback(void);
/** Chọn image trước đã hợp lệ; app quyết định thời điểm khởi động lại. */
ivts_err_t ota_schedule_rollback(void);

/** @return Phiên bản của image đang chạy (chuỗi tĩnh, không bao giờ NULL). */
const char *ota_running_version(void);

/** @return Nhãn partition đang chạy, hoặc chuỗi rỗng nếu không xác định (chuỗi tĩnh). */
const char *ota_running_partition(void);
/** @} */
