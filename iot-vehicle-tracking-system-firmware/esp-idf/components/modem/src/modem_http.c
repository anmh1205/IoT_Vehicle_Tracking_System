/**
 * @file modem_http.c
 * @brief Nguồn byte HTTP cho OTA, thực thi bằng lệnh AT HTTP của SIM7600.
 *
 * Lệnh theo AT manual (mục HTTP(S)):
 *
 *     AT+HTTPINIT / AT+HTTPTERM
 *     AT+HTTPPARA="URL","<url>"
 *     AT+HTTPACTION=0            -> OK, +HTTPACTION: <method>,<statuscode>,<datalen>
 *     AT+HTTPREAD=<off>,<size>   -> OK, +HTTPREAD: DATA,<n> <n byte> ... +HTTPREAD: 0
 *
 * Phần mô tả cú pháp AT+HTTPREAD trong manual V2.00 chỉ có một tham số, trong khi ví dụ của
 * manual dùng hai tham số (AT+HTTPREAD=0,10). Dạng hai tham số (offset, size) được dùng ở đây
 * theo ví dụ đó.
 *
 * ## Mô hình thực thi
 *
 * Các hàm modem_http_open/read/close chạy trong task "ota" và là RPC chặn: đóng gói yêu cầu vào
 * g_modem_q rồi chờ trên một semaphore nhị phân. modem_http_handle() chạy trong task "modem",
 * thực hiện lệnh AT, ghi kết quả vào biến của caller rồi give semaphore. Caller chặn đến khi đó
 * nên các con trỏ trong yêu cầu (url, buf, got...) còn sống trong suốt thời gian task "modem"
 * truy cập.
 *
 * Semaphore được tạo và xoá trong mỗi lần gọi; task "modem" luôn give, kể cả khi lỗi, nên
 * caller không bị treo vĩnh viễn.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * Phiên HTTP nằm trên module. Nếu ESP reset giữa chừng, bước mở phiên kế tiếp gọi AT+HTTPTERM
 * trước để đóng phiên còn treo.
 */

#include "modem_priv.h"
#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "freertos/queue.h"

/**
 * @brief Gửi một yêu cầu tới task "modem" và chặn đến khi nhận kết quả.
 * @return Kết quả của yêu cầu; IVTS_ERR_FULL nếu không tạo được semaphore hoặc queue đầy quá 1 s.
 */
static ivts_err_t rpc(modem_req_t *r)
{
    ivts_err_t res = IVTS_ERR_FAIL;
    r->result = &res;
    r->done = xSemaphoreCreateBinary();
    if (r->done == NULL) { return IVTS_ERR_FULL; }
    if (xQueueSend(g_modem_q, r, pdMS_TO_TICKS(1000)) != pdTRUE) {
        vSemaphoreDelete(r->done);
        return IVTS_ERR_FULL;
    }
    (void)xSemaphoreTake(r->done, portMAX_DELAY);   /* Task "modem" luôn give, kể cả khi lỗi. */
    vSemaphoreDelete(r->done);
    return res;
}

ivts_err_t modem_http_open(const char *url, uint32_t *size, int *http_status)
{
    if (url == NULL || size == NULL || http_status == NULL) { return IVTS_ERR_INVALID_ARG; }
    *size = 0u;
    *http_status = 0;
    modem_req_t r = { .op = REQ_HTTP_OPEN, .url = url, .size = size, .status = http_status };
    return rpc(&r);
}

ivts_err_t modem_http_read(uint32_t offset, uint8_t *buf, size_t len, size_t *got)
{
    if (buf == NULL || len == 0u || got == NULL) { return IVTS_ERR_INVALID_ARG; }
    *got = 0u;
    modem_req_t r = { .op = REQ_HTTP_READ, .offset = offset, .buf = buf, .len = len, .got = got };
    return rpc(&r);
}

void modem_http_close(void)
{
    modem_req_t r = { .op = REQ_HTTP_CLOSE };
    (void)rpc(&r);
}

/**
 * @brief Nhận header "+HTTPREAD: [DATA,]<n>" và chuyển parser sang chế độ thô.
 * @return true nếu dòng đã được tiêu thụ; chỉ nhận khi đang có yêu cầu đọc (http_dst != NULL).
 */
bool modem_http_on_line(const char *line)
{
    modem_t *m = &g_modem;
    if (m->http_dst == NULL || !at_has_prefix(line, "+HTTPREAD:")) { return false; }
    const char *field = line + sizeof("+HTTPREAD:") - 1u;
    while (*field == ' ') { field++; }
    int32_t n;
    if (!at_field_int(line, at_has_prefix(field, "DATA,") ? 1u : 0u, &n) || n <= 0) { return false; }
    m->http_raw = true;
    m->http_overflow |= (size_t)n > m->http_cap - m->http_len;
    modem_expect_raw((size_t)n);
    return true;
}

/**
 * @brief Mở phiên HTTP GET và đọc mã trạng thái và kích thước.
 * @retval IVTS_OK                  Mã trạng thái 200.
 * @retval IVTS_ERR_INVALID_STATE   Chưa có kết nối dữ liệu.
 * @retval IVTS_ERR_INVALID_ARG     URL quá dài so với bộ đệm lệnh.
 * @retval IVTS_ERR_TIMEOUT         AT+HTTPACTION không hoàn tất.
 * @retval IVTS_ERR_IO              Lệnh lỗi hoặc mã trạng thái khác 200.
 */
static ivts_err_t do_open(const modem_req_t *r)
{
    modem_t *m = &g_modem;
    if (m->lte.st < L_PDP) { return IVTS_ERR_INVALID_STATE; }
    if (r->url == NULL || strncmp(r->url, "https://", 8u) != 0 || strpbrk(r->url, "\"\\\r\n\t ") != NULL) {
        return IVTS_ERR_INVALID_ARG;
    }
    (void)modem_at_simple("AT+HTTPTERM", 3000);           /* Đóng phiên còn treo từ trước nếu có. */
    if (modem_at_simple("AT+HTTPINIT", 10000) != AT_RES_OK) { return IVTS_ERR_IO; }
    if (!modem_tls_configure(1)) { return IVTS_ERR_IO; }
    if (modem_at_simple("AT+HTTPPARA=\"SSLCFG\",1", 5000) != AT_RES_OK &&
        modem_at_simple("AT+HTTPPARA=\"SSLCFG\",\"1\"", 5000) != AT_RES_OK) {
        return IVTS_ERR_IO;
    }
    (void)modem_at_simple("AT+HTTPPARA=\"UA\",\"IVTS-Firmware/1.0\"", 5000);
    (void)modem_at_simple("AT+HTTPPARA=\"USERDATA\",\"Accept-Encoding: identity\"", 5000);
    char cmd[300];                                        /* URL tối đa 256 ký tự theo contract OTA. */
    int k = snprintf(cmd, sizeof cmd, "AT+HTTPPARA=\"URL\",\"%s\"", r->url);
    if (k < 0 || (size_t)k >= sizeof cmd) { return IVTS_ERR_INVALID_ARG; }
    at_cmd_t url = { .text = cmd, .timeout_ms = 5000, .redact = true };
    if (modem_at(&url) != AT_RES_OK) { return IVTS_ERR_IO; }
    at_cmd_t c = { .text = "AT+HTTPACTION=0", .final_prefix = "+HTTPACTION:", .timeout_ms = 120000 };
    if (modem_at(&c) != AT_RES_OK) { return IVTS_ERR_TIMEOUT; }
    int32_t status = 0, len = 0;
    if (!at_field_int(m->eng.resp, 1, &status) || !at_field_int(m->eng.resp, 2, &len) || len < 0) {
        return IVTS_ERR_IO;
    }
    *r->status = (int)status;
    *r->size = (uint32_t)len;
    ESP_LOGI(MODEM_TAG, "HTTPS GET: status=%ld bytes=%ld", (long)status, (long)len);
    return (status == 200) ? IVTS_OK : IVTS_ERR_IO;
}

/**
 * @brief Đọc @c r->len byte từ @c r->offset vào @c r->buf.
 *
 * Trong lúc lệnh chạy, http_dst trỏ tới bộ đệm của caller để on_data() trong modem_os.c ghi
 * trực tiếp byte thô vào đó. http_dst được đặt lại NULL ngay khi lệnh kết thúc.
 *
 * @retval IVTS_OK       Đọc được ít nhất một byte.
 * @retval IVTS_ERR_IO   Lệnh lỗi hoặc không đọc được byte nào.
 */
static ivts_err_t do_read(const modem_req_t *r)
{
    modem_t *m = &g_modem;
    char cmd[48];
    snprintf(cmd, sizeof cmd, "AT+HTTPREAD=%lu,%u", (unsigned long)r->offset, (unsigned)r->len);
    m->http_dst = r->buf;
    m->http_cap = r->len;
    m->http_len = 0;
    m->http_overflow = false;
    at_cmd_t c = { .text = cmd, .final_prefix = "+HTTPREAD: 0", .final_exact = true, .timeout_ms = 15000 };
    at_result_t res = modem_at(&c);
    m->http_dst = NULL;
    if (res != AT_RES_OK || m->http_overflow || m->http_len == 0u) { return IVTS_ERR_IO; }
    *r->got = m->http_len;
    return IVTS_OK;
}

/* Chạy trong task "modem": thực hiện yêu cầu HTTP và báo cho caller đang chặn. */
void modem_http_handle(const modem_req_t *r)
{
    ivts_err_t res = IVTS_ERR_INVALID_ARG;
    switch (r->op) {
    case REQ_HTTP_OPEN:  res = do_open(r); break;
    case REQ_HTTP_READ:  res = do_read(r); break;
    case REQ_HTTP_CLOSE: (void)modem_at_simple("AT+HTTPTERM", 5000); res = IVTS_OK; break;
    default: break;
    }
    if (r->result != NULL) { *r->result = res; }
    if (r->done != NULL) { xSemaphoreGive(r->done); }
}
