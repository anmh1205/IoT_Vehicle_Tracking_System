#pragma once
#include "ivts_core/model/command.h"

/**
 * @file storage.h
 * @brief Lưu trữ bền vững: cấu hình và trạng thái OTA trong NVS, log và offline queue trên thẻ SD.
 *
 * NVS được truy cập đồng bộ từ task gọi (NVS an toàn đa luồng). Mọi thao tác trên SD đi qua task
 * "storage": caller đưa yêu cầu vào queue và trả về ngay; lỗi thực thi báo qua
 * IVTS_EV_STORE_RESULT.
 */

#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/event/event.h"
#include "ivts_core/model/config.h"
#include "ivts_core/model/session.h"
#include "ivts_core/ota/confirm.h"

/** Cấu hình storage; storage_init() sao chép toàn bộ. */
typedef struct {
    ivts_sink_t sink;                   /**< Nơi nhận IVTS_EV_STORE_RESULT, IVTS_EV_QUEUE_READY, IVTS_EV_CONFIG_CORRUPT. */
    bool        sd_enabled;             /**< false: bỏ qua thẻ SD (không log, không offline queue). */
    int         pin_clk, pin_cmd, pin_d0, pin_d1, pin_d2, pin_d3;   /**< Chân SDMMC 4-bit; -1 = không dùng. */
    int         pin_cd;                 /**< Chân card-detect; -1 = không dùng. */
    uint32_t    log_file_max_bytes;     /**< Xoay sang file log mới khi file hiện tại vượt kích thước này. */
    uint32_t    log_quota_bytes;        /**< Tổng dung lượng log tối đa; vượt thì xoá file cũ nhất. */
    uint32_t    queue_segment_bytes;    /**< Kích thước một file đoạn của offline queue. */
    uint16_t    queue_max_segments;     /**< Số đoạn tối đa; đầy thì bỏ đoạn cũ nhất. */
    uint8_t     task_prio;              /**< Priority của task "storage". */
    uint32_t    task_stack;             /**< Stack của task "storage", byte. */
    uint8_t     req_queue_len;          /**< Số yêu cầu tối đa chờ trong queue của task "storage". */
} storage_cfg_t;

/**
 * @brief Khởi tạo NVS, gắn thẻ SD, mở offline queue và tạo task "storage".
 *
 * Gắn thẻ SD thất bại không làm hàm lỗi: storage_sd_ok() trả false và app chạy ở chế độ suy giảm
 * (không log SD, không offline queue). Chỉ lỗi NVS hoặc tạo queue/task mới làm hàm thất bại.
 *
 * @retval IVTS_OK              Đã khởi tạo.
 * @retval IVTS_ERR_INVALID_ARG cfg hoặc sink NULL.
 * @retval IVTS_ERR_IO          Không khởi tạo được NVS.
 * @retval IVTS_ERR_FULL        Không tạo được queue hoặc task.
 */
ivts_err_t storage_init(const storage_cfg_t *cfg);

/** @return true nếu thẻ SD đã gắn và offline queue đã mở. */
bool storage_sd_ok(void);

/**
 * @name NVS (đồng bộ)
 * Gọi được từ task bất kỳ. Dành cho thao tác hiếm: lúc khởi động và khi cloud đổi cấu hình.
 * @{
 */

/**
 * @brief Đọc cấu hình từ NVS.
 *
 * Khi đọc không được (CRC sai, sai version, không có), *out được đặt về ivts_config_defaults().
 * Trừ trường hợp IVTS_ERR_NOT_FOUND (thiết bị mới, không phải dữ liệu hỏng), hàm còn phát
 * IVTS_EV_CONFIG_CORRUPT.
 *
 * @retval IVTS_OK            Đọc được.
 * @retval IVTS_ERR_NOT_FOUND Chưa có cấu hình.
 * @retval IVTS_ERR_CRC       Dữ liệu hỏng.
 * @retval IVTS_ERR_VERSION   Phiên bản hoặc kích thước không khớp.
 * @retval IVTS_ERR_IO        Lỗi NVS.
 */
ivts_err_t storage_config_load(ivts_config_t *out);

/**
 * @brief Ghi cấu hình xuống NVS dưới dạng một blob duy nhất (nguyên tử).
 * @retval IVTS_ERR_INVALID_ARG cfg NULL hoặc không qua ivts_config_validate().
 */
ivts_err_t storage_config_save(const ivts_config_t *cfg);

/**
 * @brief Tăng và trả về bộ đếm lần khởi động nguội (cấp nguồn hoặc reset), lưu trong NVS.
 *        Dùng làm boot_id của message_id.
 */
ivts_err_t storage_boot_id_next(uint32_t *out);

/**
 * @brief Đọc ngữ cảnh chờ xác nhận OTA. Lưu trong NVS (không phải RTC RAM) vì phải sống qua
 *        mất nguồn. Khi đọc không được, *out được xoá về 0.
 */
ivts_err_t storage_ota_pending_load(ivts_ota_pending_t *out);

/** @brief Ghi ngữ cảnh chờ xác nhận OTA; ghi cấu trúc rỗng để xoá. */
ivts_err_t storage_ota_pending_save(const ivts_ota_pending_t *p);

ivts_err_t storage_command_receipts_load(ivts_cmd_receipts_t *out);
ivts_err_t storage_command_receipts_save(const ivts_cmd_receipts_t *receipts);

ivts_err_t storage_restart_intent_load(ivts_restart_intent_t *out);
ivts_err_t storage_restart_intent_save(const ivts_restart_intent_t *intent);
ivts_err_t storage_tracking_load(bool *enabled);
ivts_err_t storage_tracking_save(bool enabled);
ivts_err_t storage_session_load(ivts_session_state_t *state);
ivts_err_t storage_session_save(const ivts_session_state_t *state);
ivts_err_t storage_alarm_load(ivts_motion_alarm_t *alarm);
ivts_err_t storage_alarm_save(const ivts_motion_alarm_t *alarm);
/** @} */

/**
 * @name SD (bất đồng bộ)
 * Yêu cầu được sao chép theo giá trị vào queue của task "storage" nên buffer của caller dùng lại
 * được ngay. Các hàm trả IVTS_ERR_FULL khi queue yêu cầu đầy (caller quyết định bỏ hay thử lại)
 * và IVTS_ERR_INVALID_STATE khi thẻ SD không dùng được. Lỗi khi thực thi báo qua
 * IVTS_EV_STORE_RESULT; thành công thì im lặng để không làm ngập queue của app.
 * @{
 */

#define STORAGE_LOG_LINE_MAX 160u   /**< Độ dài tối đa một dòng log và một bản ghi queue, byte. */

/** @brief Ghi thêm một dòng log; dòng dài hơn STORAGE_LOG_LINE_MAX bị cắt. */
ivts_err_t storage_log_append(const char *line);
/** @} */

/**
 * @name Offline queue
 * Hàng đợi bản ghi trên SD, giữ các bản tin chưa gửi được. Bản ghi ra khỏi queue chỉ sau khi được
 * pop, nên bản ghi chưa được ACK không bị mất.
 * @{
 */

/** @brief Thêm một bản ghi đã mã hoá vào cuối queue (1..IVTS_RECORD_MAX_SIZE byte). */
ivts_err_t storage_queue_push(const uint8_t *rec, size_t len);
/** Có bản ghi đã nhận vào RAM, chưa ghi xong lên SD. */
bool storage_queue_push_pending(void);

/** @brief Yêu cầu nạp bản ghi cũ nhất vào ô peek. Khi có dữ liệu, task "storage" phát IVTS_EV_QUEUE_READY. */
ivts_err_t storage_queue_request_peek(void);

/**
 * @brief Sao chép bản ghi trong ô peek (đồng bộ, có mutex).
 * @param[out] token Mã định danh bản ghi, dùng cho storage_queue_pop().
 * @retval IVTS_ERR_NOT_FOUND Ô peek trống.
 */
ivts_err_t storage_queue_peek_copy(uint8_t *out, size_t cap, size_t *len, uint32_t *token);

/**
 * @brief Yêu cầu bỏ bản ghi đã peek, sau khi cloud ACK. Token không còn khớp (đã pop) thì bị bỏ qua.
 */
ivts_err_t storage_queue_pop(uint32_t token);

/** @return Số bản ghi còn trong queue (kể cả bản ghi trong ô peek chưa pop). */
uint32_t storage_queue_pending(void);
/** @} */
