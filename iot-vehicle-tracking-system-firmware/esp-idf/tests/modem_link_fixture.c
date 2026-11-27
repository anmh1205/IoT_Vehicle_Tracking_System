#include "modem_link_test.h"
#include "at/at.h"
#include "freertos/task.h"
#include "ivts_core/base/backoff.h"
#include "modem_internal.h"
#include "mqtt/mqtt.h"
#include "platform/platform.h"
#include "services/services.h"
#include "transport/transport.h"

#include <setjmp.h>

static modem_req_t s_queue[8];
static unsigned s_queue_count;
static void (*s_task)(void *);
static jmp_buf s_wait;
static uint64_t s_now_ms;
static bool s_pm_held;
static unsigned s_pwrkey_pulses;
static unsigned s_shutdown_pulses;
static unsigned s_power_probes;
static unsigned s_sync_probes;
static unsigned s_reg_queries;
static bool s_power_probe_fails;
static bool s_sync_fails;
static const char *s_at_case;

QueueHandle_t xQueueCreate(unsigned length, unsigned item_size)
{
    assert(length == sizeof s_queue / sizeof s_queue[0]);
    assert(item_size == sizeof s_queue[0]);
    return s_queue;
}

int xQueueSend(QueueHandle_t queue, const void *item, unsigned ticks)
{
    assert(queue == s_queue && ticks == 0u);
    if (s_queue_count == sizeof s_queue / sizeof s_queue[0]) { return 0; }
    s_queue[s_queue_count++] = *(const modem_req_t *)item;
    return pdTRUE;
}

int xQueueReceive(QueueHandle_t queue, void *item, unsigned ticks)
{
    assert(queue == s_queue && ticks == 0u);
    if (s_queue_count == 0u) { return 0; }
    *(modem_req_t *)item = s_queue[0];
    s_queue_count--;
    memmove(&s_queue[0], &s_queue[1], s_queue_count * sizeof s_queue[0]);
    return pdTRUE;
}

int xQueuePeek(QueueHandle_t queue, void *item, unsigned ticks)
{
    assert(queue == s_queue && item != NULL && ticks > 0u);
    longjmp(s_wait, 1);
}

int xTaskCreate(void (*task)(void *), const char *name, unsigned stack, void *arg,
                unsigned prio, void *handle)
{
    (void)name;
    (void)stack;
    (void)arg;
    (void)prio;
    (void)handle;
    s_task = task;
    return 1;
}

SemaphoreHandle_t xSemaphoreCreateBinary(void)
{
    assert(false);
    return NULL;
}

void vSemaphoreDelete(SemaphoreHandle_t semaphore) { (void)semaphore; }

/* Run the real modem task until it reaches its next scheduler wait. */
static void run_task_iteration(void)
{
    if (setjmp(s_wait) == 0) { s_task(NULL); }
}

uint64_t platform_uptime_ms(void) { return s_now_ms; }

void platform_delay_ms(uint32_t ms)
{
    if (ms == 3000u) {
        assert(!modem_is_stopped() && s_pm_held);
        s_shutdown_pulses++;
    }
    s_now_ms += ms;
}

esp_err_t gpio_config(const gpio_config_t *config)
{
    assert(config->mode == GPIO_MODE_OUTPUT);
    return ESP_OK;
}

esp_err_t gpio_set_level(int pin, int level)
{
    assert(pin == 0 && (level == 0 || level == 1));
    if (level == 0) { s_pwrkey_pulses++; }  /* The fixture uses active-low PWRKEY. */
    return ESP_OK;
}

esp_err_t esp_pm_lock_create(int type, int arg, const char *name, esp_pm_lock_handle_t *lock)
{
    (void)arg;
    (void)name;
    assert(type == ESP_PM_NO_LIGHT_SLEEP);
    *lock = &s_pm_held;
    return ESP_OK;
}

esp_err_t esp_pm_lock_acquire(esp_pm_lock_handle_t lock)
{
    assert(!*lock);
    *lock = true;
    return ESP_OK;
}

esp_err_t esp_pm_lock_release(esp_pm_lock_handle_t lock)
{
    assert(*lock);
    *lock = false;
    return ESP_OK;
}

bool modem_slots_init(void) { return true; }
esp_err_t modem_uart_open(const modem_cfg_t *cfg) { (void)cfg; return ESP_OK; }
void modem_at_dispatch_init(void) {}
void modem_at_dispatch_pump(uint32_t wait_ms) { assert(wait_ms > 0u); longjmp(s_wait, 1); }
void modem_mqtt_rx_init(void) {}
void modem_gnss_init(void) {}
void modem_gnss_reset_power(void) {}
void modem_gnss_step(void) {}
void modem_gnss_request(bool enabled) { (void)enabled; }
void modem_mqtt_publish_pending(void) { assert(false); }
void modem_tx_done(bool ok, int16_t error) { (void)ok; (void)error; assert(false); }

bool modem_tx_take(modem_topic_t *topic, const char **payload, size_t *len, uint32_t *tx_id)
{
    (void)topic;
    (void)payload;
    (void)len;
    (void)tx_id;
    return false;
}

ivts_err_t modem_http_handle(const modem_req_t *request)
{
    (void)request;
    assert(false);
    return IVTS_ERR_FAIL;
}

static ivts_err_t sink(void *ctx, const ivts_event_t *event)
{
    (void)ctx;
    (void)event;
    return IVTS_OK;
}

static void init_modem(void)
{
    const modem_cfg_t cfg = { .sink = { .fn = sink }, .client_id = "fixture" };
    assert(modem_init(&cfg) == IVTS_OK);
    assert(modem_is_stopped());
}

static void start_modem(void)
{
    assert(modem_set_link(true) == IVTS_OK);
    assert(!modem_is_stopped());
    run_task_iteration();
    assert(modem_link_current_step() == MODEM_LINK_STEP_SYNC);
}

static void link_up_queue_full(void)
{
    assert(modem_set_link(true) == IVTS_ERR_INVALID_STATE);
    assert(modem_is_stopped());
    init_modem();
    for (size_t i = 0; i < sizeof s_queue / sizeof s_queue[0]; i++) {
        assert(modem_set_gnss(true) == IVTS_OK);
    }
    assert(modem_set_link(true) == IVTS_ERR_FULL);
    assert(modem_is_stopped());
    run_task_iteration();
    assert(modem_link_current_step() == MODEM_LINK_STEP_OFF);

    assert(modem_set_link(true) == IVTS_OK);
    for (size_t i = 1; i < sizeof s_queue / sizeof s_queue[0]; i++) {
        assert(modem_set_gnss(true) == IVTS_OK);
    }
    assert(modem_set_link(true) == IVTS_ERR_FULL);
    assert(!modem_is_stopped());
    run_task_iteration();
    assert(modem_link_current_step() == MODEM_LINK_STEP_SYNC && !modem_is_stopped());
}

static void restart_defers_power_pulse(void)
{
    init_modem();
    start_modem();
    assert(s_pwrkey_pulses == 0u);
    assert(modem_set_link(false) == IVTS_OK);
    run_task_iteration();
    assert(modem_link_current_step() == MODEM_LINK_STEP_OFF);
    assert(s_pwrkey_pulses == 1u && s_shutdown_pulses == 1u);
    assert(modem_is_stopped() && !s_pm_held && modem_power_restart_is_blocked());

    /* Model an unresponsive modem so the first allowed startup attempt pulses PWRKEY. */
    s_power_probe_fails = true;
    assert(modem_set_link(true) == IVTS_OK);
    assert(!modem_is_stopped());
    run_task_iteration();
    assert(modem_link_current_step() == MODEM_LINK_STEP_POWER);
    assert(s_pwrkey_pulses == 1u && s_power_probes == 1u);
    s_now_ms += 29999u;
    run_task_iteration();
    assert(s_pwrkey_pulses == 1u && s_power_probes == 1u);
    s_now_ms++;
    run_task_iteration();
    assert(s_pwrkey_pulses == 2u && s_power_probes == 2u);
    assert(modem_link_current_step() == MODEM_LINK_STEP_SYNC && s_pm_held);
}

static void registration_restart_backoff(void)
{
    init_modem();
    start_modem();
    const ivts_backoff_t backoff = { .base_ms = 1000u, .max_ms = 60000u, .jitter_ms = 2000u };
    for (unsigned restart = 0; restart < 2u; restart++) {
        run_task_iteration();
        assert(modem_link_current_step() == MODEM_LINK_STEP_SIM);
        run_task_iteration();
        assert(modem_link_current_step() == MODEM_LINK_STEP_REG);
        uint64_t timeout_ms = s_now_ms + 180001u;
        run_task_iteration();
        assert(s_reg_queries == 2u * restart + 1u && modem_link_current_step() == MODEM_LINK_STEP_REG);
        s_now_ms = timeout_ms;
        run_task_iteration();
        assert(modem_link_current_step() == MODEM_LINK_STEP_POWER);
        uint32_t delay_ms = ivts_backoff_ms(&backoff, 0u, (uint32_t)timeout_ms);
        s_now_ms += delay_ms - 1u;
        run_task_iteration();
        assert(s_power_probes == restart + 1u);
        s_now_ms++;
        run_task_iteration();
        assert(s_power_probes == restart + 2u && s_shutdown_pulses == 0u);
    }
}

static void sync_failure_power_cycle(void)
{
    init_modem();
    start_modem();
    s_sync_fails = true;
    for (unsigned attempt = 1u; attempt <= 8u; attempt++) {
        s_now_ms += 63000u;
        run_task_iteration();
        assert(s_sync_probes == attempt);
        assert(s_shutdown_pulses == (attempt == 8u ? 1u : 0u));
    }
    assert(modem_link_current_step() == MODEM_LINK_STEP_POWER && modem_power_restart_is_blocked());
    assert(!modem_is_stopped() && s_pm_held);
}

static void at_write(void *ctx, const void *data, size_t len)
{
    (void)ctx;
    assert(data != NULL && len > 0u);
}

static void feed_line(at_engine_t *engine, at_parser_t *parser, const char *text)
{
    for (const char *byte = text; *byte != '\0'; byte++) {
        at_unit_t unit = at_parser_feed(parser, (uint8_t)*byte);
        if (unit == AT_UNIT_LINE) { assert(at_engine_on_line(engine, parser->buf)); }
    }
}

at_result_t modem_at_simple(const char *text, uint32_t timeout_ms)
{
    if (strcmp(text, "AT") == 0 && timeout_ms == 500u) {
        s_power_probes++;
        if (s_power_probe_fails) { return AT_RES_TIMEOUT; }
    }
    if (strcmp(text, "AT") == 0 && timeout_ms == 1000u) {
        s_sync_probes++;
        if (s_sync_fails) { return AT_RES_TIMEOUT; }
    }
    return AT_RES_OK;
}

at_result_t modem_at(const at_cmd_t *command)
{
    if (strcmp(command->text, "AT+CPIN?") == 0) { return AT_RES_OK; }
    if (strcmp(command->text, "AT+CEREG?") == 0) {
        s_reg_queries++;
        return AT_RES_TIMEOUT;
    }

    /* Use the production MQTT START descriptor and separate parser reads for the reply. */
    assert(strcmp(command->text, "AT+CMQTTSTART") == 0 && s_at_case != NULL);
    at_engine_t engine;
    at_parser_t parser;
    at_engine_init(&engine, (at_tx_t){ .write = at_write });
    at_parser_init(&parser);
    assert(at_engine_start(&engine, command, 0) == IVTS_OK);
    if (strcmp(s_at_case, "mqtt_final_error_before_error") == 0) {
        feed_line(&engine, &parser, "+CMQTTSTART: 23\r\n");
        assert(at_engine_poll(&engine, 1u) == AT_RES_PENDING);
        feed_line(&engine, &parser, "ERROR\r\n");
        assert(at_engine_poll(&engine, 2u) == AT_RES_ERROR);
        assert(strcmp(engine.resp, "+CMQTTSTART: 23") == 0);
        return AT_RES_ERROR;
    }
    if (strcmp(s_at_case, "mqtt_missing_ok_times_out") == 0) {
        feed_line(&engine, &parser, "+CMQTTSTART: 0\r\n");
        assert(at_engine_poll(&engine, command->timeout_ms - 1u) == AT_RES_PENDING);
        return at_engine_poll(&engine, command->timeout_ms);
    }

    bool ok_first = strcmp(s_at_case, "mqtt_ok_before_final") == 0;
    feed_line(&engine, &parser, ok_first ? "OK\r\n" : "+CMQTTSTART: 0\r\n");
    assert(at_engine_poll(&engine, 1u) == AT_RES_PENDING);
    feed_line(&engine, &parser, ok_first ? "+CMQTTSTART: 0\r\n" : "OK\r\n");
    assert(at_engine_poll(&engine, 2u) == AT_RES_OK);
    assert(strcmp(engine.resp, "+CMQTTSTART: 0") == 0);

    at_cmd_t next = { .text = "AT+CMQTTACCQ=0,\"fixture\",0,4", .timeout_ms = 100u };
    assert(at_engine_start(&engine, &next, 3u) == IVTS_OK);
    assert(at_engine_poll(&engine, 4u) == AT_RES_PENDING);
    feed_line(&engine, &parser, "OK\r\n");
    assert(at_engine_poll(&engine, 5u) == AT_RES_OK);
    return AT_RES_OK;
}

const char *modem_at_response(void) { return "+CPIN: READY"; }

static void httpread_final_only(void)
{
    at_engine_t engine;
    at_parser_t parser;
    at_engine_init(&engine, (at_tx_t){ .write = at_write });
    at_parser_init(&parser);
    at_cmd_t read = { .text = "AT+HTTPREAD=0,8", .final_prefix = "+HTTPREAD: 0",
                      .final_exact = true, .timeout_ms = 100u };
    assert(at_engine_start(&engine, &read, 0) == IVTS_OK);
    feed_line(&engine, &parser, "+HTTPREAD: 0\r\n");
    assert(at_engine_poll(&engine, 1u) == AT_RES_OK);
}

int main(int argc, const char *argv[])
{
    assert(argc == 2);
    static const struct { const char *name; void (*run)(void); } cases[] = {
        { "link_up_queue_full", link_up_queue_full },
        { "restart_defers_power_pulse", restart_defers_power_pulse },
        { "registration_restart_backoff", registration_restart_backoff },
        { "sync_failure_power_cycle", sync_failure_power_cycle },
        { "httpread_final_only", httpread_final_only },
    };
    for (size_t i = 0; i < sizeof cases / sizeof cases[0]; i++) {
        if (strcmp(argv[1], cases[i].name) == 0) {
            cases[i].run();
            return 0;
        }
    }
    s_at_case = argv[1];
    init_modem();
    bool ok = modem_mqtt_step(MODEM_LINK_STEP_MQTT_START);
    assert(ok == (strcmp(s_at_case, "mqtt_final_before_ok") == 0 ||
                  strcmp(s_at_case, "mqtt_ok_before_final") == 0));
    return 0;
}
