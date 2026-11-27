/**
 * @file modem_gnss.c
 * @brief Điều khiển GNSS của SIM7600 và đọc vị trí định kỳ.
 *
 * Lệnh dùng theo AT manual SIM7500_SIM7600 V2.00:
 * - AT+CGPS=<on/off>[,<mode>] (mục 17.2.1); mode 1 là standalone.
 * - AT+CGNSSINFO (mục 17.2.2): kết quả đầy đủ có số vệ tinh từng hệ, nguồn IVTS_GNSS_SRC_FULL.
 * - AT+CGPSINFO (mục 17.2.21): kết quả rút gọn, dùng khi AT+CGNSSINFO lỗi, nguồn IVTS_GNSS_SRC_APPROX.
 *
 * Chạy trong task "modem" (xem modem_os.c); không có trạng thái riêng ngoài g_modem.
 */

#include "modem_priv.h"
#include <string.h>
#include "esp_log.h"
#include "gnss_parse.h"

/**
 * @brief Một bước điều khiển GNSS: đưa module về trạng thái mong muốn, rồi đọc vị trí theo chu kỳ.
 *
 * Nếu gnss_wanted khác gnss_on thì gửi lệnh bật hoặc tắt. Khi lệnh lỗi, hỏi AT+CGPS? để biết
 * trạng thái thật của module (bật khi đã bật cũng trả ERROR) thay vì suy đoán. Khi đã bật và
 * đến hạn, đọc vị trí và phát IVTS_EV_GNSS_FIX nếu phân tích được.
 */
void modem_gnss_step(void)
{
    modem_t *m = &g_modem;
    if (m->gnss_wanted != m->gnss_on) {
        bool previous = m->gnss_on;
        at_result_t r = modem_at_simple(m->gnss_wanted ? "AT+CGPS=1,1" : "AT+CGPS=0", 5000);
        if (r != AT_RES_OK) {
            at_cmd_t q = { .text = "AT+CGPS?", .capture = "+CGPS:", .timeout_ms = 2000 };
            int32_t on = 0;
            if (modem_at(&q) == AT_RES_OK && at_field_int(m->eng.resp, 0, &on)) {
                m->gnss_on = (on == 1);
            }
        } else {
            m->gnss_on = m->gnss_wanted;
        }
        if (m->gnss_on != previous) {
            ESP_LOGI(MODEM_TAG, "GNSS %s", m->gnss_on ? "on" : "off");
        }
        m->gnss_next = modem_now() + 1000;
        return;
    }
    if (!m->gnss_on || modem_now() < m->gnss_next) { return; }
    m->gnss_next = modem_now() + (uint64_t)m->cfg.gnss_period_s * 1000u;

    ivts_gnss_t g;
    at_cmd_t c = { .text = "AT+CGNSSINFO", .capture = "+CGNSSINFO:", .timeout_ms = 2000 };
    bool ok = modem_at(&c) == AT_RES_OK && gnss_parse_cgnssinfo(m->eng.resp, &g) == IVTS_OK;
    if (!ok) {
        at_cmd_t c2 = { .text = "AT+CGPSINFO", .capture = "+CGPSINFO:", .timeout_ms = 2000 };
        ok = modem_at(&c2) == AT_RES_OK && gnss_parse_cgpsinfo(m->eng.resp, &g) == IVTS_OK;
    }
    if (!ok) { return; }
    ivts_event_t ev = { .type = IVTS_EV_GNSS_FIX, .ts_ms = modem_now() };
    ev.u.gnss = g;
    modem_emit(&ev);
}
