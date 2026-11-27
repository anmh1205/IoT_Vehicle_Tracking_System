#pragma once
#include "ivts_core/event/event.h"
#include "storage/nvs_store.h"
#include "storage/offline_queue.h"
#include "storage/sd_log.h"

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
