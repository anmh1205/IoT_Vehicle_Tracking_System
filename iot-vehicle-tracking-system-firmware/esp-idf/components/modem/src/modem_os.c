/**
 * @file modem_os.c
 * @brief Task "modem": sở hữu UART, GPIO PWRKEY và SIM7600; thực thi lệnh AT và xử lý URC.
 *
 * ## Mô hình thực thi
 *
 * Task "modem" (priority và stack từ modem_cfg_t; app_init.c đặt 6 và 6144 B):
 * - Là task duy nhất truy cập UART, at_engine, at_parser và g_modem (ngoại trừ ô publish và ô
 *   command, xem modem.c). Vì vậy các cấu trúc này không cần khoá.
 * - Priority cao nhất hệ thống: byte UART phải được rút kịp. Ở 115200 baud, bộ đệm RX 4 KB đầy
 *   sau khoảng 0,36 s nếu task không chạy.
 * - Mọi lệnh AT chạy tuần tự trong task này và chặn đến khi xong hoặc hết timeout. Trong lúc
 *   chờ, modem_at() gọi modem_pump() nên URC đến giữa chừng (ví dụ command từ cloud) vẫn được
 *   xử lý.
 *
 * Mỗi vòng lặp của modem_task():
 * 1. Rút hết yêu cầu trong g_modem_q (set_link, set_gnss, kick, RPC HTTP).
 * 2. Chạy một bước máy trạng thái LTE, bước GNSS (sau khi đồng bộ AT), rồi gửi bản tin trong ô
 *    publish (khi link L_UP); chưa có broker thì báo ACK lỗi ngay để app không chờ vô ích.
 * 3. Chờ: khi module tắt (L_OFF) thì chặn trên g_modem_q tối đa 1 s; ngược lại đọc UART tối đa
 *    LOOP_WAIT_MS.
 *
 * ## Queue yêu cầu g_modem_q
 *
 * - Producer: modem_set_link, modem_set_gnss, modem_publish (kick) từ task bất kỳ; các hàm
 *   modem_http_* từ task "ota". Gửi với timeout 0 (riêng HTTP: 1 s), không bao giờ chặn lâu.
 * - Consumer: chỉ task "modem". Yêu cầu được sao chép theo giá trị; riêng RPC HTTP mang con trỏ
 *   an toàn vì caller chặn trên semaphore (xem modem_priv.h).
 *
 * ## Nguồn điện (power management)
 *
 * Light sleep tự động tắt clock UART, nên khi nói chuyện với module task giữ khoá
 * ESP_PM_NO_LIGHT_SLEEP (modem_pm_hold). Khoá được nhả khi link tắt.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Không có trạng thái bền vững. Sau reset, module có thể còn nguồn; bước L_POWER thử lệnh AT
 * trước khi phát xung PWRKEY để không tắt nhầm một module đang chạy.
 */

#include "modem_priv.h"
#include <stdio.h>
#include <string.h>
#include "driver/gpio.h"
#include "driver/uart.h"
#include "esp_check.h"
#include "esp_log.h"
#include "esp_pm.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "ivts_core/base/civil.h"
#include "sdkconfig.h"

#define UART_RX_BUF 4096     /* Bộ đệm RX của driver UART, byte. */
#define UART_TX_BUF 2048     /* Bộ đệm TX của driver UART, byte. */
#define REQ_QUEUE_LEN 8      /* Số yêu cầu tối đa chờ trong g_modem_q. */
#define LOOP_WAIT_MS 50      /* Thời gian chờ UART mỗi vòng khi module đang bật. */
#define RAW_TIMEOUT_MS 3000u

QueueHandle_t g_modem_q;
static esp_pm_lock_handle_t s_pm;   /* Khoá cấm light sleep; NULL nếu CONFIG_PM_ENABLE tắt. */
static bool s_pm_held;              /* Khoá đang được giữ; chỉ task "modem" truy cập. */

/** Đường ghi của at_engine: ghi byte ra UART. */
static void uart_tx(void *ctx, const void *buf, size_t n)
{
    (void)ctx;
    (void)uart_write_bytes(g_modem.cfg.uart_num, buf, n);
}

/* Giữ hoặc nhả khoá cấm light sleep. Gọi lặp với cùng giá trị không có tác dụng. */
void modem_pm_hold(bool hold)
{
    /* Auto light sleep tắt clock UART, nên cấm light sleep trong lúc nói chuyện với module. */
    if (s_pm == NULL || hold == s_pm_held) { return; }
    if (hold) { (void)esp_pm_lock_acquire(s_pm); } else { (void)esp_pm_lock_release(s_pm); }
    s_pm_held = hold;
}

/* Kéo PWRKEY trong @p ms rồi nhả; chặn task trong khoảng đó. Mức kéo phụ thuộc pwrkey_inverted. */
void modem_power_pulse(uint32_t ms)
{
    int on = g_modem.cfg.pwrkey_inverted ? 1 : 0;
    gpio_set_level(g_modem.cfg.pin_pwrkey, on);
    vTaskDelay(pdMS_TO_TICKS(ms));
    gpio_set_level(g_modem.cfg.pin_pwrkey, !on);
}

void modem_power_down(void)
{
    if (modem_now() < g_modem.power_restart_at) { return; }
    modem_power_pulse(3000);
    /* SIM7600 Hardware Design, bảng 9: UART còn hoạt động trong khi tắt,
     * STATUS thường xuống sau 26 s. Board không đưa STATUS về ESP32. */
    g_modem.power_restart_at = modem_now() + 30000u;
    g_modem.gnss_on = false;
}

/** Xử lý dòng không thuộc lệnh đang chạy: URC của HTTP và MQTT. */
static void on_unsolicited(const char *line)
{
    if (modem_http_on_line(line)) { return; }       /* "+HTTPREAD: DATA,n" chuyển parser sang chế độ thô. */
    modem_mqtt_on_urc(line);
}

void modem_expect_raw(size_t len)
{
    at_parser_expect_raw(&g_modem.parser, len);
    g_modem.raw_deadline_ms = modem_now() + RAW_TIMEOUT_MS;
}

static void discard_partial_frame(void)
{
    if (g_modem.http_raw) { g_modem.http_overflow = true; }
    g_modem.http_raw = false;
    g_modem.rx.active = false;
    g_modem.rx.pending_header = 0;
    at_parser_init(&g_modem.parser);
    (void)uart_flush_input(g_modem.cfg.uart_num);
}

/**
 * @brief Nhận một khối dữ liệu thô từ parser và đưa vào đích đang chờ.
 *
 * Header gần nhất chọn đích: HTTPREAD hoặc topic/payload MQTT. URC MQTT đến khi chờ
 * HTTPREAD vẫn đi vào bộ đệm command.
 */
static void on_data(const uint8_t *buf, size_t n)
{
    modem_t *m = &g_modem;
    if (m->http_raw) {
        if (m->http_dst != NULL) {
            size_t room = m->http_cap - m->http_len;
            size_t k = (n < room) ? n : room;
            memcpy(m->http_dst + m->http_len, buf, k);
            m->http_len += k;
        }
        if (m->parser.raw_left == 0u) { m->http_raw = false; }
        return;
    }
    if (m->rx.active && m->rx.phase == 1u) {
        size_t room = sizeof m->rx.topic - 1u - m->rx.tlen;
        size_t k = (n < room) ? n : room;
        memcpy(m->rx.topic + m->rx.tlen, buf, k);
        m->rx.tlen += k;
        m->rx.topic[m->rx.tlen] = '\0';
        m->rx.overflow |= (k < n);
    } else if (m->rx.active && m->rx.phase == 2u) {
        size_t room = sizeof m->rx.payload - m->rx.plen;
        size_t k = (n < room) ? n : room;
        memcpy(m->rx.payload + m->rx.plen, buf, k);
        m->rx.plen += k;
        m->rx.overflow |= (k < n);
    }
}

/**
 * Đọc UART tối đa @p wait_ms, đưa từng byte qua parser và phân phối kết quả:
 * dòng -> engine hoặc on_unsolicited(); prompt '>' -> engine; dữ liệu thô -> on_data().
 */
void modem_pump(uint32_t wait_ms)
{
    if (g_modem.parser.raw_left != 0u && modem_now() >= g_modem.raw_deadline_ms) {
        ESP_LOGW(MODEM_TAG, "UART: khung dữ liệu thô bị cắt");
        discard_partial_frame();
    }
    uint8_t buf[128];
    int n = uart_read_bytes(g_modem.cfg.uart_num, buf, sizeof buf, pdMS_TO_TICKS(wait_ms));
    for (int i = 0; i < n; i++) {
        at_unit_t u = at_parser_feed(&g_modem.parser, buf[i]);
        if (u == AT_UNIT_LINE) {
            if (!at_engine_on_line(&g_modem.eng, g_modem.parser.buf)) {
                on_unsolicited(g_modem.parser.buf);
            }
        } else if (u == AT_UNIT_PROMPT) {
            at_engine_on_prompt(&g_modem.eng);
        } else if (u == AT_UNIT_DATA) {
            on_data((const uint8_t *)g_modem.parser.buf, g_modem.parser.len);
        }
    }
}

/**
 * Chạy một lệnh AT và chặn đến khi xong. Kết quả lỗi hoặc timeout được ghi log kèm dòng phản hồi.
 * Chỉ gọi từ task "modem".
 */
at_result_t modem_at(const at_cmd_t *c)
{
    if (at_engine_start(&g_modem.eng, c, modem_now()) != IVTS_OK) { return AT_RES_ERROR; }
    for (;;) {
        modem_pump(20);
        at_result_t r = at_engine_poll(&g_modem.eng, modem_now());
        if (r != AT_RES_PENDING) {
            if (r == AT_RES_TIMEOUT && g_modem.parser.raw_left != 0u) { discard_partial_frame(); }
            if (r != AT_RES_OK) {
                ESP_LOGW(MODEM_TAG, "%s -> %s %s", c->redact ? "AT (credential/URL)" : c->text,
                         r == AT_RES_TIMEOUT ? "TIMEOUT" : "ERROR", c->redact ? "" : g_modem.eng.resp);
            }
            return r;
        }
    }
}

/** Chạy lệnh chỉ gồm văn bản và timeout. Xem modem_at(). */
at_result_t modem_at_simple(const char *text, uint32_t timeout_ms)
{
    at_cmd_t c = { .text = text, .timeout_ms = timeout_ms };
    return modem_at(&c);
}

bool modem_tls_configure(unsigned index)
{
    char cmd[180];
    uint64_t unix_ms;
    if (g_modem.cfg.time_get != NULL && g_modem.cfg.time_get(&unix_ms)) {
        ivts_civil_t c;
        ivts_unix_ms_to_civil(unix_ms, &c);
        snprintf(cmd, sizeof cmd, "AT+CCLK=\"%02u/%02u/%02u,%02u:%02u:%02u+00\"",
                 (unsigned)c.year % 100u, c.month, c.day, c.hour, c.min, c.sec);
        (void)modem_at_simple(cmd, 2000);
    }
    static const struct { const char *key; unsigned value; } settings[] = {
        { "sslversion", 3 }, { "authmode", 1 }, { "ignorelocaltime", 0 },
        { "enableSNI", 1 }, { "negotiatetime", 30 },
    };
    for (size_t i = 0; i < sizeof settings / sizeof settings[0]; i++) {
        int n = snprintf(cmd, sizeof cmd, "AT+CSSLCFG=\"%s\",%u,%u", settings[i].key, index, settings[i].value);
        if (n <= 0 || (size_t)n >= sizeof cmd || modem_at_simple(cmd, 3000) != AT_RES_OK) { return false; }
    }
    static const char ca[] = CONFIG_IVTS_MODEM_CA_CERT;
    if (ca[0] == '\0' || strpbrk(ca, "\"\\\r\n") != NULL) { return false; }
    int n = snprintf(cmd, sizeof cmd, "AT+CSSLCFG=\"cacert\",%u,\"%s\"", index, ca);
    return n > 0 && (size_t)n < sizeof cmd && modem_at_simple(cmd, 3000) == AT_RES_OK;
}

/**
 * @brief Thực hiện một yêu cầu từ g_modem_q.
 *
 * REQ_LINK với on = false ngắt broker, phát xung tắt nguồn và báo link xuống.
 * Máy trạng thái có thể vào L_OFF trong khi phần cứng đang hoàn tất tắt.
 */
static void handle_req(const modem_req_t *r)
{
    switch (r->op) {
    case REQ_LINK:
        g_modem.link_wanted = r->on;
        if (!r->on) {
            modem_mqtt_disconnect();
            if (g_modem.lte.st != L_OFF) { modem_power_down(); }
            modem_lte_reset(L_OFF);
            modem_emit_link(IVTS_LINK_DOWN, 0);
            modem_pm_hold(false);
            modem_set_stopped(true);
        } else if (g_modem.lte.st == L_OFF) {
            modem_set_stopped(false);
            modem_lte_reset(L_POWER);
        }
        break;
    case REQ_GNSS:
        g_modem.gnss_wanted = r->on;
        break;
    case REQ_PUB_KICK:
        break;                                    /* Chỉ để đánh thức vòng lặp. */
    default:
        modem_http_handle(r);
        break;
    }
}

/** Thân task "modem": xem mô tả ở đầu file. */
static void modem_task(void *arg)
{
    (void)arg;
    modem_req_t r;
    for (;;) {
        while (xQueueReceive(g_modem_q, &r, 0) == pdTRUE) { handle_req(&r); }
        modem_lte_step();
        if (g_modem.lte.st >= L_SIM) { modem_gnss_step(); }
        if (g_modem.lte.st == L_UP) {
            modem_mqtt_publish_pending();
        } else {
            modem_topic_t t; const char *p; size_t n; uint32_t id;
            if (modem_tx_take(&t, &p, &n, &id)) { modem_tx_done(false, -1); }   /* Chưa có broker: báo lỗi ngay. */
        }
        if (g_modem.lte.st == L_OFF) {
            (void)xQueuePeek(g_modem_q, &r, pdMS_TO_TICKS(1000));   /* Module tắt: chờ yêu cầu mới, không đọc UART. */
        } else {
            modem_pump(LOOP_WAIT_MS);
        }
    }
}

/**
 * @brief Cấu hình UART và GPIO PWRKEY, tạo PM lock, queue yêu cầu và task "modem".
 * @return ESP_OK, hoặc lỗi của bước đầu tiên thất bại (ESP_ERR_NO_MEM nếu không tạo được queue/task).
 */
esp_err_t modem_os_start(void)
{
    const modem_cfg_t *c = &g_modem.cfg;
    uart_config_t uc = {
        .baud_rate = (int)c->baud,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_XTAL,    /* Giữ baud ổn định khi quản lý nguồn đổi tần số APB. */
    };
    ESP_RETURN_ON_ERROR(uart_driver_install(c->uart_num, UART_RX_BUF, UART_TX_BUF, 0, NULL, 0), MODEM_TAG, "uart install");
    ESP_RETURN_ON_ERROR(uart_param_config(c->uart_num, &uc), MODEM_TAG, "uart cfg");
    ESP_RETURN_ON_ERROR(uart_set_pin(c->uart_num, c->pin_tx, c->pin_rx, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE),
                        MODEM_TAG, "uart pin");
    gpio_config_t io = { .pin_bit_mask = 1ULL << c->pin_pwrkey, .mode = GPIO_MODE_OUTPUT };
    ESP_RETURN_ON_ERROR(gpio_config(&io), MODEM_TAG, "pwrkey");
    gpio_set_level(c->pin_pwrkey, c->pwrkey_inverted ? 0 : 1);     /* Nhả PWRKEY. */
#if CONFIG_PM_ENABLE
    ESP_RETURN_ON_ERROR(esp_pm_lock_create(ESP_PM_NO_LIGHT_SLEEP, 0, "modem", &s_pm), MODEM_TAG, "pm lock");
#endif
    at_parser_init(&g_modem.parser);
    at_engine_init(&g_modem.eng, (at_tx_t){ uart_tx, NULL });
    g_modem_q = xQueueCreate(REQ_QUEUE_LEN, sizeof(modem_req_t));
    ESP_RETURN_ON_FALSE(g_modem_q != NULL, ESP_ERR_NO_MEM, MODEM_TAG, "queue");
    BaseType_t ok = xTaskCreate(modem_task, "modem", c->task_stack, NULL, c->task_prio, NULL);
    ESP_RETURN_ON_FALSE(ok == pdPASS, ESP_ERR_NO_MEM, MODEM_TAG, "task");
    return ESP_OK;
}
