/**
 * @file app_events.c
 * @brief Queue sự kiện của app và việc tạo task "app".
 *
 * ## Mô hình thực thi
 *
 * Task "app" (priority 5, stack 6144 B):
 * - App consumes these events and owns application state.
 *
 * Queue s_event_queue (APP_QUEUE_LEN phần tử, mỗi phần tử là một ivts_event_t sao chép theo giá trị):
 * - Producer: task "modem", "board", "storage", "obd", "ota" gọi sink_fn() từ ngữ cảnh task.
 * - Không có producer nào chạy trong ISR: ISR của IMU chỉ notify task "board".
 * - sink_fn() dùng timeout 0 nên producer không bao giờ bị chặn bởi app chậm. Queue đầy thì
 *   sự kiện bị bỏ, trả IVTS_ERR_FULL và tăng s_drops.
 * - Sự kiện chỉ mang giá trị nhỏ; dữ liệu lớn nằm trong "slot" của component sở hữu và được
 *   lấy bằng hàm riêng sau khi nhận sự kiện báo hiệu.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Queue nằm trong RAM nên sự kiện chưa xử lý bị mất khi reset. Dữ liệu cần bền vững
 * (offline queue, cấu hình, OTA pending) do storage ghi riêng, không đi qua queue này.
 */

#include "app_events.h"
#include <stdatomic.h>
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"

#define APP_QUEUE_LEN   32     /* Số sự kiện tối đa chờ xử lý. */

static QueueHandle_t s_event_queue;                  /* Queue sự kiện; tạo một lần trong app_events_init(). */
static _Atomic uint32_t s_drops;           /* Số sự kiện bỏ do đầy; nhiều task tăng đồng thời. */

/**
 * @brief Sink của app: sao chép sự kiện vào queue mà không chờ.
 * @return IVTS_OK nếu đã xếp hàng; IVTS_ERR_FULL nếu queue đầy (sự kiện bị bỏ và được đếm).
 * @note Gọi từ ngữ cảnh task của bất kỳ component nào; không gọi từ ISR.
 */
static ivts_err_t sink_fn(void *ctx, const ivts_event_t *ev)
{
    (void)ctx;
    if (xQueueSend(s_event_queue, ev, 0) == pdTRUE) {
        return IVTS_OK;
    }
    atomic_fetch_add_explicit(&s_drops, 1u, memory_order_relaxed);
    return IVTS_ERR_FULL;
}

bool app_events_init(void)
{
    s_event_queue = xQueueCreate(APP_QUEUE_LEN, sizeof(ivts_event_t));
    return s_event_queue != NULL;
}

ivts_sink_t app_events_sink(void)
{
    return (ivts_sink_t){ .fn = sink_fn, .ctx = NULL };
}

bool app_events_receive(ivts_event_t *ev, uint32_t timeout_ms)
{
    return xQueueReceive(s_event_queue, ev, pdMS_TO_TICKS(timeout_ms)) == pdTRUE;
}

uint32_t app_events_drops(void) { return atomic_load_explicit(&s_drops, memory_order_relaxed); }

bool app_events_start_task(void (*fn)(void *), uint32_t stack_bytes, uint8_t priority)
{
    return xTaskCreate(fn, "app", stack_bytes, NULL, priority, NULL) == pdPASS;
}
