#include "modem_internal.h"
#include "at/at.h"
#include "esp_check.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/semphr.h"
#include "freertos/task.h"
#include "mqtt/mqtt.h"
#include "transport/transport.h"

#define REQ_QUEUE_LEN 8u
#define LOOP_WAIT_MS 50u

static QueueHandle_t s_request_queue;

ivts_err_t modem_task_post(const modem_req_t *request, uint32_t timeout_ms)
{
    if (s_request_queue == NULL) { return IVTS_ERR_INVALID_STATE; }
    return xQueueSend(s_request_queue, request, pdMS_TO_TICKS(timeout_ms)) == pdTRUE ? IVTS_OK : IVTS_ERR_FULL;
}

struct modem_rpc {
    SemaphoreHandle_t done;
    ivts_err_t result;
};

ivts_err_t modem_task_call(modem_req_t *request)
{
    struct modem_rpc reply = {
        .done = xSemaphoreCreateBinary(),
        .result = IVTS_ERR_FAIL,
    };
    if (reply.done == NULL) { return IVTS_ERR_FULL; }
    request->reply = &reply;
    if (modem_task_post(request, 1000u) != IVTS_OK) {
        vSemaphoreDelete(reply.done);
        return IVTS_ERR_FULL;
    }
    /* Completion also releases the borrowed URL and output buffers. */
    (void)xSemaphoreTake(reply.done, portMAX_DELAY);
    vSemaphoreDelete(reply.done);
    return reply.result;
}

static void link_down(void)
{
    modem_mqtt_disconnect();
    if (modem_link_current_step() != MODEM_LINK_STEP_OFF) { modem_link_power_down(); }
    modem_link_reset(MODEM_LINK_STEP_OFF);
    modem_emit_link(IVTS_LINK_DOWN, 0);
    modem_pm_hold(false);
    modem_set_stopped(true);
}

static void link_up(void)
{
    if (modem_link_current_step() != MODEM_LINK_STEP_OFF) { return; }
    modem_set_stopped(false);
    modem_link_reset(MODEM_LINK_STEP_POWER);
}

static void handle_req(const modem_req_t *r)
{
    switch (r->op) {
    case REQ_LINK:
        if (r->on) { link_up(); }
        else { link_down(); }
        break;
    case REQ_GNSS:
        modem_gnss_request(r->on);
        break;
    case REQ_PUB_KICK:
        break;                                    /* Chỉ để đánh thức vòng lặp. */
    default: {
        ivts_err_t result = modem_http_handle(r);
        if (r->reply != NULL) {
            r->reply->result = result;
            /* This signal is the last access to caller-owned request storage. */
            xSemaphoreGive(r->reply->done);
        }
        break;
    }
    }
}

static void modem_task(void *arg)
{
    (void)arg;
    modem_req_t r;
    for (;;) {
        while (xQueueReceive(s_request_queue, &r, 0) == pdTRUE) { handle_req(&r); }
        modem_link_tick();
        if (modem_link_current_step() >= MODEM_LINK_STEP_SIM) { modem_gnss_step(); }
        if (modem_link_current_step() == MODEM_LINK_STEP_UP) {
            modem_mqtt_publish_pending();
        } else {
            modem_topic_t t; const char *p; size_t n; uint32_t id;
            if (modem_tx_take(&t, &p, &n, &id)) { modem_tx_done(false, -1); }   /* Chưa có broker: báo lỗi ngay. */
        }
        if (modem_link_current_step() == MODEM_LINK_STEP_OFF) {
            (void)xQueuePeek(s_request_queue, &r, pdMS_TO_TICKS(1000));   /* Module tắt: chờ yêu cầu mới, không đọc UART. */
        } else {
            modem_at_dispatch_pump(LOOP_WAIT_MS);
        }
    }
}

static esp_err_t start_task(const modem_cfg_t *c)
{
    s_request_queue = xQueueCreate(REQ_QUEUE_LEN, sizeof(modem_req_t));
    ESP_RETURN_ON_FALSE(s_request_queue != NULL, ESP_ERR_NO_MEM, MODEM_TAG, "queue");
    BaseType_t ok = xTaskCreate(modem_task, "modem", c->task_stack, NULL, c->task_prio, NULL);
    ESP_RETURN_ON_FALSE(ok == pdPASS, ESP_ERR_NO_MEM, MODEM_TAG, "task");
    return ESP_OK;
}

esp_err_t modem_task_start(const modem_cfg_t *cfg)
{
    esp_err_t error = modem_uart_open(cfg);
    if (error == ESP_OK) { error = modem_power_gpio_init(cfg); }
    if (error == ESP_OK) { error = modem_pm_lock_create(); }
    if (error != ESP_OK) { return error; }
    modem_at_dispatch_init();
    modem_link_init();
    modem_mqtt_rx_init();
    modem_gnss_init();
    modem_power_init();
    return start_task(cfg);
}
