/**
 * @file storage_task.c
 * @brief Task "storage": thực thi mọi thao tác trên thẻ SD tuần tự.
 *
 * ## Mô hình thực thi
 *
 * Task "storage" (priority và stack từ storage_cfg_t; app_wiring.c đặt 3 và 5120 B):
 * - Sở hữu thẻ SD và FATFS: không task nào khác mở file trên SD, nên không cần khoá FATFS.
 * - Là consumer duy nhất của s_request_queue. Chặn vô hạn trên xQueueReceive khi không có việc.
 *
 * Queue s_request_queue (req_queue_len phần tử, mỗi phần tử là storage_req_t sao chép theo giá trị):
 * - Producer: task "app" (log, push, request_peek, pop). Gửi với timeout 0 nên không bao giờ chặn
 *   caller; queue đầy thì trả IVTS_ERR_FULL.
 * - Mỗi yêu cầu mang bản sao dữ liệu (tối đa STORAGE_LOG_LINE_MAX byte), nên buffer của caller
 *   dùng lại được ngay khi hàm trả về.
 *
 * Kết quả:
 * - Lỗi thực thi báo qua IVTS_EV_STORE_RESULT (thành công thì im lặng).
 * - Peek thành công báo qua IVTS_EV_QUEUE_READY (phát trong storage_queue_do_peek()); dữ liệu nằm
 *   trong ô peek do mutex bảo vệ và được lấy bằng storage_queue_peek_copy().
 * - Pop không báo lỗi khi token đã cũ: ACK trùng là bình thường.
 *
 * Thứ tự yêu cầu của một producer được giữ nguyên (FIFO), nên push rồi pop từ cùng task "app"
 * thực hiện đúng thứ tự đó.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Queue yêu cầu nằm trong RAM: yêu cầu chưa xử lý bị mất khi reset (ví dụ bản ghi vừa push chưa
 * kịp ghi xuống SD). Dữ liệu đã ghi xuống SD tồn tại; xem storage_queue.c về cách khôi phục.
 */

#include "storage_internal.h"
#include "queue/queue.h"
#include "sd/sd.h"
#include <stdatomic.h>
#include <string.h>
#include "esp_check.h"
#include "esp_log.h"
#include "platform/platform.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "ivts_core/model/record.h"

/** Loại yêu cầu gửi tới task "storage". */
typedef enum {
    REQ_LOG = 0,   /**< Ghi một dòng log. */
    REQ_Q_PUSH,    /**< Thêm bản ghi vào offline queue. */
    REQ_Q_PEEK,    /**< Nạp bản ghi cũ nhất vào ô peek. */
    REQ_Q_POP      /**< Bỏ bản ghi đã peek (theo token). */
} req_op_t;

/** Một yêu cầu, sao chép theo giá trị vào queue. */
typedef struct {
    uint8_t  op;                            /**< req_op_t. */
    uint16_t len;                           /**< Số byte hợp lệ trong data. */
    uint32_t token;                         /**< REQ_Q_POP: token của bản ghi cần bỏ. */
    uint8_t  data[STORAGE_LOG_LINE_MAX];    /**< Dòng log hoặc bản ghi đã mã hoá. */
} storage_req_t;

_Static_assert(IVTS_RECORD_MAX_SIZE <= STORAGE_LOG_LINE_MAX, "bản ghi phải vừa ô data của yêu cầu");

static QueueHandle_t s_request_queue;   /* Queue yêu cầu; consumer duy nhất là task "storage". */
static atomic_uint s_pending_pushes;

/** Đưa yêu cầu vào queue mà không chờ. @return IVTS_ERR_FULL nếu queue đầy. */
static ivts_err_t post(const storage_req_t *r)
{
    if (s_request_queue == NULL) { return IVTS_ERR_INVALID_STATE; }
    return (xQueueSend(s_request_queue, r, 0) == pdTRUE) ? IVTS_OK : IVTS_ERR_FULL;
}

/* Xem storage.h. */
ivts_err_t storage_log_append(const char *line)
{
    if (line == NULL) { return IVTS_ERR_INVALID_ARG; }
    if (!storage_sd_ok()) { return IVTS_ERR_INVALID_STATE; }
    storage_req_t r = { .op = REQ_LOG };
    size_t n = strnlen(line, STORAGE_LOG_LINE_MAX);
    memcpy(r.data, line, n);                 /* Dòng quá dài bị cắt: lỗi log không được làm caller thất bại. */
    r.len = (uint16_t)n;
    return post(&r);
}

/* Xem storage.h. */
ivts_err_t storage_queue_push(const uint8_t *rec, size_t len)
{
    if (rec == NULL || len == 0u || len > IVTS_RECORD_MAX_SIZE) { return IVTS_ERR_INVALID_ARG; }
    if (!storage_sd_ok()) { return IVTS_ERR_INVALID_STATE; }
    storage_req_t r = { .op = REQ_Q_PUSH, .len = (uint16_t)len };
    memcpy(r.data, rec, len);
    atomic_fetch_add(&s_pending_pushes, 1u);
    ivts_err_t e = post(&r);
    if (e != IVTS_OK) { atomic_fetch_sub(&s_pending_pushes, 1u); }
    return e;
}

bool storage_queue_has_unflushed_push(void) { return atomic_load(&s_pending_pushes) != 0u; }

/* Xem storage.h. */
ivts_err_t storage_queue_request_peek(void)
{
    if (!storage_sd_ok()) { return IVTS_ERR_INVALID_STATE; }
    storage_req_t r = { .op = REQ_Q_PEEK };
    return post(&r);
}

/* Xem storage.h. */
ivts_err_t storage_queue_pop(uint32_t token)
{
    storage_req_t r = { .op = REQ_Q_POP, .token = token };
    return post(&r);
}

/** Báo kết quả qua IVTS_EV_STORE_RESULT; thành công thì không phát gì. */
static void report(uint8_t op, ivts_err_t e)
{
    if (e == IVTS_OK) { return; }
    ivts_event_t ev = { .type = IVTS_EV_STORE_RESULT, .ts_ms = platform_uptime_ms() };
    ev.u.store_result.op = op;
    ev.u.store_result.err = (int32_t)e;
    storage_emit(&ev);
}

/** Thân task "storage": nhận yêu cầu và thực thi tuần tự. */
static void storage_task(void *arg)
{
    (void)arg;
    storage_req_t r;
    for (;;) {
        if (xQueueReceive(s_request_queue, &r, portMAX_DELAY) != pdTRUE) { continue; }
        switch (r.op) {
        case REQ_LOG:    report(IVTS_STORE_OP_LOG_APPEND, storage_sd_log_write((const char *)r.data, r.len)); break;
        case REQ_Q_PUSH:
            report(IVTS_STORE_OP_QUEUE_PUSH, storage_queue_do_push(r.data, r.len));
            atomic_fetch_sub(&s_pending_pushes, 1u);
            break;
        case REQ_Q_PEEK: report(IVTS_STORE_OP_QUEUE_PEEK, storage_queue_do_peek()); break;
        case REQ_Q_POP: {
            ivts_err_t e = storage_queue_do_pop(r.token);
            if (e != IVTS_ERR_NOT_FOUND) { report(IVTS_STORE_OP_QUEUE_POP, e); }
            break;
        }
        default: break;
        }
    }
}

esp_err_t storage_task_start(void)
{
    s_request_queue = xQueueCreate(storage_config_view()->req_queue_len, sizeof(storage_req_t));
    ESP_RETURN_ON_FALSE(s_request_queue != NULL, ESP_ERR_NO_MEM, STORAGE_TAG, "queue");
    BaseType_t ok = xTaskCreate(storage_task, "storage", storage_config_view()->task_stack, NULL,
                                storage_config_view()->task_prio, NULL);
    ESP_RETURN_ON_FALSE(ok == pdPASS, ESP_ERR_NO_MEM, STORAGE_TAG, "task");
    return ESP_OK;
}
