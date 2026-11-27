/**
 * @file app_diag.c
 * @brief Chẩn đoán runtime: stack high-water-mark của từng task và bộ nhớ heap.
 *
 * Chỉ được biên dịch đầy đủ khi bật CONFIG_IVTS_DIAG_STACK_LOG; ngược lại app_diag_tick() rỗng.
 * Hàm chỉ gọi từ task "app" nên bộ đệm static không cần khoá.
 */

#include "app_diag.h"
#include "app_log.h"
#include "app_timing.h"
#include "esp_heap_caps.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "sdkconfig.h"

#if CONFIG_IVTS_DIAG_STACK_LOG
#define MAX_TASKS 24   /* Số task tối đa ghi log; nhiều hơn thì bỏ qua lần log đó. */

/**
 * @brief Mỗi 60 giây ghi log stack còn trống của từng task và thống kê heap.
 *
 * Trên ESP-IDF StackType_t là uint8_t nên high-water-mark tính bằng byte. Mức còn trống nên
 * giữ tối thiểu khoảng 1 KB sau khi chạy qua mọi đường thực thi (OTA, replay, OBD diag).
 */
void app_diag_tick(uint64_t now_ms)
{
    static uint64_t next;
    if (now_ms < next) { return; }
    next = now_ms + DIAG_PERIOD_MS;
    static TaskStatus_t st[MAX_TASKS];             /* static để không tốn stack (~1 KB); chỉ task "app" gọi. */
    UBaseType_t n = uxTaskGetSystemState(st, MAX_TASKS, NULL);
    if (n == 0u) { ESP_LOGW(APP_TAG, "diag: hơn %d task", MAX_TASKS); return; }
    for (UBaseType_t i = 0; i < n; i++) {
        ESP_LOGI(APP_TAG, "hwm %-12s prio %2u free %5u B", st[i].pcTaskName,
                 (unsigned)st[i].uxBasePriority, (unsigned)st[i].usStackHighWaterMark);
    }
    ESP_LOGI(APP_TAG, "heap free %u min %u largest %u", (unsigned)heap_caps_get_free_size(MALLOC_CAP_8BIT),
             (unsigned)heap_caps_get_minimum_free_size(MALLOC_CAP_8BIT),
             (unsigned)heap_caps_get_largest_free_block(MALLOC_CAP_8BIT));
}
#else
/** Bản rỗng khi CONFIG_IVTS_DIAG_STACK_LOG tắt. */
void app_diag_tick(uint64_t now_ms) { (void)now_ms; }
#endif
