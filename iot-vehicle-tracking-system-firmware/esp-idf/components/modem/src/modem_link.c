#include "modem_internal.h"
#include "esp_log.h"
#include "ivts_core/base/backoff.h"
#include "transport/transport.h"

static modem_link_t s_link;

#define FAILS_POWER_CYCLE  8u        /* Số thất bại tích luỹ dẫn đến power-cycle. */

/* Backoff giữa các lần thử lại: 1 s tăng dần đến 60 s, cộng jitter đến 2 s. */
static const ivts_backoff_t k_step_backoff = { .base_ms = 1000, .max_ms = 60000, .jitter_ms = 2000 };

/** Tên bước, dùng cho log. */
static const char *st_name(modem_link_step_t s)
{
    static const char *const n[] = { "OFF", "POWER", "SYNC", "SIM", "REG", "PDP",
                                     "MQTT_START", "MQTT_ACQ", "MQTT_CONN", "MQTT_SUB", "UP" };
    return (s <= MODEM_LINK_STEP_UP) ? n[s] : "?";
}

/* Đặt máy trạng thái về @p to và xoá bộ đếm; fails_total chỉ xoá khi về MODEM_LINK_STEP_OFF hoặc MODEM_LINK_STEP_POWER. */
void modem_link_reset(modem_link_step_t to)
{
    s_link.step = to;
    s_link.attempt = 0;
    s_link.retry_at_ms = 0;
    s_link.entered_at_ms = modem_now();
    if (to <= MODEM_LINK_STEP_POWER) { s_link.fails_total = 0; }
}

/** Chuyển sang bước @p to, xoá bộ đếm thử lại và ghi log. */
static void go(modem_link_step_t to)
{
    ESP_LOGI(MODEM_TAG, "lte %s -> %s", st_name(s_link.step), st_name(to));
    s_link.step = to;
    s_link.attempt = 0;
    s_link.retry_at_ms = 0;
    s_link.entered_at_ms = modem_now();
}

/**
 * @brief Ghi nhận một lần thất bại và đặt thời điểm thử lại theo backoff.
 *
 * Đủ FAILS_POWER_CYCLE lần thất bại tích luỹ thì tắt nguồn module bằng PWRKEY, báo link xuống
 * và quay về MODEM_LINK_STEP_POWER.
 */
static void fail(void)
{
    modem_link_t *l = &s_link;
    l->fails_total++;
    if (l->fails_total >= FAILS_POWER_CYCLE) {
        ESP_LOGW(MODEM_TAG, "lte: %lu lần lỗi, power-cycle modem", (unsigned long)l->fails_total);
        modem_link_power_down();
        modem_emit_link(IVTS_LINK_DOWN, (int32_t)IVTS_ERR_TIMEOUT);
        modem_link_reset(MODEM_LINK_STEP_POWER);
        return;
    }
    uint32_t d = ivts_backoff_ms(&k_step_backoff, l->attempt, (uint32_t)modem_now());
    l->attempt++;
    l->retry_at_ms = modem_now() + d;
}

/* Mất kết nối broker: về bước kết nối lại, mạng dữ liệu vẫn giữ. */
void modem_link_on_connection_lost(void)
{
    if (s_link.step >= MODEM_LINK_STEP_MQTT_CONN) {
        modem_emit_link(IVTS_LINK_NET_UP, 0);
        go(MODEM_LINK_STEP_MQTT_CONN);
    }
}
static void apply_step_result(modem_link_t *link, step_result_t result)
{
    switch (result.action) {
    case MODEM_LINK_ADVANCE:
        go(result.target);
        if (result.delay_ms != 0u) { link->retry_at_ms = modem_now() + result.delay_ms; }
        break;
    case MODEM_LINK_FAIL: fail(); break;
    case MODEM_LINK_RETRY_LATER: link->retry_at_ms = modem_now() + result.delay_ms; break;
    case MODEM_LINK_RESTART:
        fail();
        go(MODEM_LINK_STEP_POWER);
        break;
    case MODEM_LINK_BROKER_UP:
        go(MODEM_LINK_STEP_UP);
        modem_emit_link(IVTS_LINK_BROKER_UP, 0);
        break;
    case MODEM_LINK_IDLE: break;
    }
}

void modem_link_tick(void)
{
    modem_link_t *link = &s_link;
    if (link->step == MODEM_LINK_STEP_OFF || link->step == MODEM_LINK_STEP_UP || modem_now() < link->retry_at_ms) { return; }
    apply_step_result(link, modem_link_run_step(link));
}

void modem_link_init(void)
{
    s_link = (modem_link_t){0};
}

modem_link_step_t modem_link_current_step(void)
{
    return s_link.step;
}

void modem_link_power_down(void)
{
    if (modem_power_down()) { modem_gnss_reset_power(); }
}
