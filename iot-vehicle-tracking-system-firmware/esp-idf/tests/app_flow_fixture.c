/* Start the real app, then drive its task through fake FreeRTOS and component APIs. */
#include <assert.h>
#include <setjmp.h>
#include <stdio.h>
#include <string.h>
#include "app/app.h"
#include "board/board.h"
#include "esp_random.h"
#include "esp_system.h"
#include "esp_timer.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "ivts_core/model/record.h"
#include "modem/modem.h"
#include "obd/obd.h"
#include "ota/ota.h"
#include "storage/storage.h"

enum { BOOT_ID = 0x20, OFFLINE_TOKEN = 7, CAPACITY = 32 };

typedef struct {
    modem_topic_t topic;
    uint32_t tx_id;
    char payload[MODEM_PAYLOAD_MAX + 1];
} fixture_message_t;

static jmp_buf s_task_exit;
static void (*s_task)(void *);
static void (*s_before_tick)(unsigned);
static ivts_sink_t s_sink;
static ivts_event_t s_events[CAPACITY];
static size_t s_event_count;
static uint64_t s_now_ms;
static uint64_t s_expected_restart_at_ms;
static unsigned s_tick;
static const char *s_case_name;
static ivts_link_t s_link = IVTS_LINK_BROKER_UP;
static const char *s_command;
static bool s_ack_automatically;
static bool s_publish_busy;
static bool s_reject_publish;
static bool s_modem_stopped;
static fixture_message_t s_messages[CAPACITY];
static size_t s_message_count;
static ivts_session_state_t s_session;
static ivts_motion_alarm_t s_alarm;
static ivts_ota_pending_t s_ota_context;
static ivts_cmd_receipts_t s_receipts;
static ivts_restart_intent_t s_restart_intent;
static bool s_image_pending_verify;
static bool s_fail_receipts_save;
static bool s_tracking_enabled = true;
static unsigned s_receipts_saves;
static unsigned s_tracking_saves;
static unsigned s_mark_valid_calls;
static unsigned s_rollback_calls;
static unsigned s_sleep_calls;
static unsigned s_ota_starts;
static unsigned s_ota_context_clears;
static bool s_progress_ready;
static bool s_restart_called;
static bool s_gnss_enabled;
static ivts_record_t s_last_queued;
static unsigned s_queue_pushes;
static unsigned s_queue_pops;
static unsigned s_peek_requests;
static uint32_t s_offline_count;
static bool s_peek_ready;
static ivts_record_t s_offline_head;

static _Noreturn void finish(void)
{
    longjmp(s_task_exit, 1);
}

int64_t esp_timer_get_time(void) { return (int64_t)(s_now_ms * 1000u); }
esp_reset_reason_t esp_reset_reason(void) { return ESP_RST_POWERON; }
uint32_t esp_random(void) { return BOOT_ID; }
void esp_restart(void)
{
    assert(s_expected_restart_at_ms != 0u && s_now_ms == s_expected_restart_at_ms);
    s_restart_called = true;
    finish();
}

QueueHandle_t xQueueCreate(unsigned length, unsigned item_size)
{
    assert(length == CAPACITY && item_size == sizeof(ivts_event_t));
    return s_events;
}

int xQueueSend(QueueHandle_t queue, const void *item, unsigned ticks)
{
    assert(queue == s_events && ticks == 0u && s_event_count < CAPACITY);
    memcpy(&s_events[s_event_count++], item, sizeof(ivts_event_t));
    return pdTRUE;
}

static void post(ivts_event_t event)
{
    event.ts_ms = s_now_ms;
    assert(s_sink.fn(s_sink.ctx, &event) == IVTS_OK);
}

static void ack(bool ok)
{
    assert(s_publish_busy && s_message_count > 0u);
    s_publish_busy = false;
    ivts_event_t event = { .type = IVTS_EV_MQTT_ACK };
    event.u.mqtt_ack.tx_id = s_messages[s_message_count - 1u].tx_id;
    event.u.mqtt_ack.ok = ok ? 1u : 0u;
    post(event);
}

int xQueueReceive(QueueHandle_t queue, void *item, unsigned ticks)
{
    assert(queue == s_events);
    if (ticks > 0u) {
        s_now_ms += ticks;
        assert(s_tick < 25u);
        if (s_publish_busy && s_ack_automatically) { ack(true); }
        s_before_tick(++s_tick);
    }
    if (s_event_count == 0u) { return 0; }
    memcpy(item, &s_events[0], sizeof(ivts_event_t));
    s_event_count--;
    memmove(s_events, s_events + 1, s_event_count * sizeof(ivts_event_t));
    return pdTRUE;
}

int xTaskCreate(void (*task)(void *), const char *name, unsigned stack,
                void *arg, unsigned prio, void *handle)
{
    assert(strcmp(name, "app") == 0 && stack == 6144u && prio == 5u);
    assert(arg == NULL && handle == NULL);
    s_task = task;
    return 1;
}

void vTaskDelay(unsigned ticks) { s_now_ms += ticks; }

ivts_err_t board_init(const board_cfg_t *cfg)
{
    s_sink = cfg->sink;
    return IVTS_OK;
}

ivts_err_t board_time_get(uint64_t *unix_ms, bool *trusted)
{
    *unix_ms = UINT64_C(1710000000000) + s_now_ms;
    *trusted = true;
    return IVTS_OK;
}

ivts_err_t board_time_set(uint64_t unix_ms) { (void)unix_ms; return IVTS_OK; }
bool board_imu_ok(void) { return true; }
bool board_motion_deep_wake_capable(void) { return false; }
ivts_err_t board_set_auto_light_sleep(bool enabled) { assert(!enabled); return IVTS_OK; }
void board_led_set(bool on) { (void)on; }
board_wake_t board_wake_cause(void) { return BOARD_WAKE_OTHER; }
board_wake_t board_sleep(const board_sleep_req_t *req)
{
    assert(!req->deep && req->arm_imu);
    s_sleep_calls++;
    return BOARD_WAKE_TIMER;
}

ivts_err_t modem_init(const modem_cfg_t *cfg) { assert(cfg->sink.fn == s_sink.fn); return IVTS_OK; }
ivts_err_t modem_set_link(bool on) { s_modem_stopped = !on; return IVTS_OK; }
bool modem_is_stopped(void) { return s_modem_stopped; }
ivts_link_t modem_link_state(void) { return s_link; }
ivts_err_t modem_set_gnss(bool on) { s_gnss_enabled = on; return IVTS_OK; }
uint32_t modem_cmd_dropped(void) { return 0; }

ivts_err_t modem_publish(modem_topic_t topic, const char *payload, size_t len, uint32_t tx_id)
{
    if (s_reject_publish && topic == MODEM_TOPIC_STATUS) { return IVTS_ERR_FULL; }
    assert(!s_publish_busy && s_message_count < CAPACITY && len <= MODEM_PAYLOAD_MAX);
    fixture_message_t *message = &s_messages[s_message_count++];
    *message = (fixture_message_t){ .topic = topic, .tx_id = tx_id };
    memcpy(message->payload, payload, len);
    s_publish_busy = true;
    return IVTS_OK;
}

bool modem_publish_result(uint32_t tx_id, bool *ok, int16_t *err)
{
    (void)tx_id; (void)ok; (void)err;
    return false;
}

ivts_err_t modem_cmd_take(char *out, size_t cap, size_t *len)
{
    if (s_command == NULL) { return IVTS_ERR_NOT_FOUND; }
    *len = strlen(s_command);
    assert(*len < cap);
    memcpy(out, s_command, *len + 1u);
    s_command = NULL;
    return IVTS_OK;
}

ivts_err_t modem_http_open(const char *url, uint32_t *size, int *status)
{
    (void)url; (void)size; (void)status;
    return IVTS_ERR_IO;
}

ivts_err_t modem_http_read(uint32_t offset, uint8_t *buf, size_t len, size_t *got)
{
    (void)offset; (void)buf; (void)len; (void)got;
    return IVTS_ERR_IO;
}

void modem_http_close(void) {}

ivts_err_t storage_init(const storage_cfg_t *cfg) { assert(cfg->sink.fn == s_sink.fn); return IVTS_OK; }
bool storage_sd_ok(void) { return true; }
ivts_err_t storage_boot_id_next(uint32_t *out) { *out = BOOT_ID; return IVTS_OK; }
ivts_err_t storage_config_load(ivts_config_t *out)
{
    ivts_config_defaults(out);
    out->tracking_interval_s = 1u;
    return IVTS_OK;
}

ivts_err_t storage_config_save(const ivts_config_t *cfg) { (void)cfg; return IVTS_OK; }
ivts_err_t storage_tracking_load(bool *enabled) { *enabled = s_tracking_enabled; return IVTS_OK; }
ivts_err_t storage_tracking_save(bool enabled)
{
    s_tracking_enabled = enabled;
    s_tracking_saves++;
    return IVTS_OK;
}

ivts_err_t storage_session_load(ivts_session_state_t *out) { *out = s_session; return IVTS_OK; }
ivts_err_t storage_session_save(const ivts_session_state_t *session) { s_session = *session; return IVTS_OK; }
ivts_err_t storage_alarm_load(ivts_motion_alarm_t *alarm) { *alarm = s_alarm; return IVTS_OK; }
ivts_err_t storage_alarm_save(const ivts_motion_alarm_t *alarm) { s_alarm = *alarm; return IVTS_OK; }
ivts_err_t storage_ota_pending_load(ivts_ota_pending_t *out) { *out = s_ota_context; return IVTS_OK; }
ivts_err_t storage_ota_pending_save(const ivts_ota_pending_t *ctx)
{
    s_ota_context = *ctx;
    if (!ctx->pending) { s_ota_context_clears++; }
    return IVTS_OK;
}

ivts_err_t storage_command_receipts_load(ivts_cmd_receipts_t *out) { *out = s_receipts; return IVTS_OK; }
ivts_err_t storage_command_receipts_save(const ivts_cmd_receipts_t *receipts)
{
    if (s_fail_receipts_save) { return IVTS_ERR_IO; }
    s_receipts_saves++;
    s_receipts = *receipts;
    return IVTS_OK;
}

ivts_err_t storage_restart_intent_load(ivts_restart_intent_t *out)
{
    *out = s_restart_intent;
    return out->id[0] == '\0' ? IVTS_ERR_NOT_FOUND : IVTS_OK;
}

ivts_err_t storage_restart_intent_save(const ivts_restart_intent_t *intent)
{
    s_restart_intent = *intent;
    return IVTS_OK;
}

ivts_err_t storage_queue_push(const uint8_t *record, size_t len)
{
    assert(ivts_record_decode(record, len, &s_last_queued) == IVTS_OK);
    s_queue_pushes++;
    return IVTS_OK;
}

bool storage_queue_push_pending(void) { return false; }
uint32_t storage_queue_pending(void) { return s_offline_count; }
ivts_err_t storage_queue_request_peek(void)
{
    s_peek_requests++;
    s_peek_ready = true;
    post((ivts_event_t){ .type = IVTS_EV_QUEUE_READY });
    return IVTS_OK;
}

ivts_err_t storage_queue_peek_copy(uint8_t *out, size_t cap, size_t *len, uint32_t *token)
{
    if (!s_peek_ready) { return IVTS_ERR_NOT_FOUND; }
    *token = OFFLINE_TOKEN;
    return ivts_record_encode(&s_offline_head, out, cap, len);
}

ivts_err_t storage_queue_pop(uint32_t token)
{
    assert(s_peek_ready && token == OFFLINE_TOKEN);
    s_queue_pops++;
    return IVTS_OK;
}

ivts_err_t obd_init(const obd_cfg_t *cfg) { assert(cfg->sink.fn == s_sink.fn); return IVTS_OK; }
ivts_err_t obd_start(void) { return IVTS_OK; }
ivts_err_t obd_stop(void) { return IVTS_OK; }
bool obd_is_stopped(void) { return true; }
ivts_err_t obd_diag_copy(ivts_obd_readiness_t *readiness, ivts_dtc_list_t *stored,
                        ivts_dtc_list_t *pending, ivts_dtc_list_t *permanent)
{
    (void)readiness; (void)stored; (void)pending; (void)permanent;
    return IVTS_ERR_NOT_FOUND;
}

ivts_err_t ota_init(const ota_cfg_t *cfg) { assert(cfg->sink.fn == s_sink.fn); return IVTS_OK; }
ivts_err_t ota_start(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_battery_mv)
{
    assert(strcmp(cmd->job_id, "job-1") == 0 && battery_mv >= min_battery_mv);
    s_ota_starts++;
    return IVTS_OK;
}

const char *ota_running_version(void) { return "2.0.0"; }
const char *ota_running_partition(void) { return "ota_1"; }
bool ota_image_pending_verify(void) { return s_image_pending_verify; }
ivts_err_t ota_mark_valid(void) { s_mark_valid_calls++; return IVTS_OK; }
ivts_err_t ota_rollback_and_reboot(void) { s_rollback_calls++; return IVTS_OK; }
bool ota_can_rollback(void) { return true; }
ivts_err_t ota_schedule_rollback(void) { return IVTS_OK; }
bool ota_progress_take(ivts_event_t *ev)
{
    if (!s_progress_ready) { return false; }
    *ev = (ivts_event_t){ .type = IVTS_EV_OTA_PROGRESS };
    ev->u.ota_progress.phase = IVTS_OTA_ST_FAILED;
    ev->u.ota_progress.err = IVTS_OTA_E_SOURCE_READ;
    s_progress_ready = false;
    return true;
}

static void power_sample(bool ignition_on)
{
    ivts_event_t event = { .type = IVTS_EV_POWER_SAMPLE };
    event.u.power.vehicle_mv = ignition_on ? 14000u : 0u;
    event.u.power.device_mv = 4200u;
    post(event);
}

static void expect_message(size_t index, modem_topic_t topic, const char *fragment)
{
    assert(index < s_message_count);
    const fixture_message_t *message = &s_messages[index];
    if (message->topic != topic || strstr(message->payload, fragment) == NULL) {
        fprintf(stderr, "%s: message %zu should contain %s on topic %d, got %d %s\n",
                s_case_name, index, fragment, topic, message->topic, message->payload);
        assert(false);
    }
}

static void raw_flow(unsigned tick)
{
    if (tick == 2u) { power_sample(true); }
    if (tick == 4u) {
        if (strcmp(s_case_name, "raw_live_ack_error") == 0) {
            assert(s_queue_pushes == 0u);
            expect_message(0, MODEM_TOPIC_RAWDATA, "\"metadata\"");
            ack(false);
            return;
        }
        assert(s_queue_pushes == 1u);
        assert(s_last_queued.boot_id == BOOT_ID && s_last_queued.vehicle_mv == 14000u);
        if (strcmp(s_case_name, "raw_broker_down") == 0) { assert(s_message_count == 0u); }
        if (strcmp(s_case_name, "raw_publisher_busy") == 0) { expect_message(2, MODEM_TOPIC_STATUS, "\"status\""); }
        finish();
    }
    if (tick == 5u) {
        assert(s_queue_pushes == 1u);
        assert(s_last_queued.boot_id == BOOT_ID && s_last_queued.vehicle_mv == 14000u);
        finish();
    }
}

static void replay_and_control_order(unsigned tick)
{
    switch (tick) {
    case 1:
        post((ivts_event_t){ .type = IVTS_EV_CONFIG_CORRUPT });
        break;
    case 2:
        expect_message(0, MODEM_TOPIC_EVENTS, "motion_detected");
        assert(s_alarm.seq != 0u);
        ack(true);
        break;
    case 3:
        assert(s_alarm.seq == 0u && s_peek_requests == 1u && s_message_count == 1u);
        break;
    case 4:
        expect_message(1, MODEM_TOPIC_RAWDATA, "\"seq_no\":11");
        assert(s_queue_pops == 0u);
        ack(false);
        break;
    case 5:
        expect_message(2, MODEM_TOPIC_RAWDATA, "\"seq_no\":11");
        assert(s_queue_pops == 0u);
        ack(true);
        break;
    case 6:
        assert(s_queue_pops == 1u && s_message_count == 3u);
        break; /* The old peek token is still visible until storage handles pop. */
    case 7:
        assert(s_message_count == 3u);
        s_offline_count = 0;
        s_peek_ready = false;
        break;
    case 8:
        expect_message(3, MODEM_TOPIC_STATUS, "\"boundary_event\":\"ended\"");
        ack(true);
        break;
    case 9:
        expect_message(4, MODEM_TOPIC_STATUS, "\"status\"");
        assert(s_session.count == 0u);
        ack(true);
        break;
    case 10:
        expect_message(5, MODEM_TOPIC_FIRMWARE, "\"status\":\"success\"");
        ack(true);
        break;
    case 11:
        expect_message(6, MODEM_TOPIC_EVENTS, "config_corrupt");
        finish();
    default:
        assert(false);
    }
}

static void ota_boot(unsigned tick)
{
    if (tick == 2u) {
        expect_message(0, MODEM_TOPIC_STATUS, "\"status\"");
        ack(true);
    }
    if (tick == 3u) {
        const char *status = strcmp(s_case_name, "ota_boot_rolled_back") == 0
            ? "\"status\":\"rolled_back\"" : "\"status\":\"success\"";
        expect_message(1, MODEM_TOPIC_FIRMWARE, status);
        assert(s_ota_context_clears == 0u);
        ack(true);
    }
    if (tick == 4u) {
        bool had_context = strcmp(s_case_name, "ota_boot_normal") != 0;
        assert(s_ota_context_clears == (had_context ? 1u : 0u));
        finish();
    }
}

static void ota_confirmation(unsigned tick)
{
    if (tick == 2u) {
        expect_message(0, MODEM_TOPIC_FIRMWARE, "\"status\":\"confirming\"");
        assert(s_mark_valid_calls == 0u && s_alarm.seq != 0u);
        if (strcmp(s_case_name, "ota_deadline") == 0) {
            s_now_ms = (uint64_t)s_ota_context.timeout_s * 1000u;
        } else {
            ack(true);
        }
    }
    if (tick == 3u && strcmp(s_case_name, "ota_deadline") == 0) {
        assert(s_mark_valid_calls == 0u && s_rollback_calls == 1u);
        finish();
    }
    if (tick == 3u) {
        assert(s_mark_valid_calls == 1u && s_rollback_calls == 0u && s_ota_context_clears == 0u);
        expect_message(1, MODEM_TOPIC_EVENTS, "motion_detected");
        ack(true);
        s_ack_automatically = true;
    }
    if (tick == 6u) {
        expect_message(3, MODEM_TOPIC_FIRMWARE, "\"status\":\"success\"");
        assert(s_ota_context_clears == 1u);
        finish();
    }
}

static const char k_tracking_cmd[] =
    "{\"command_id\":\"17\",\"command\":\"enable_tracking\",\"params\":{\"enabled\":false}}";
static const char k_restart_cmd[] = "{\"command_id\":\"30\",\"command\":\"reboot\"}";

static void command_receipts(unsigned tick)
{
    if (tick == 1u) { s_command = k_tracking_cmd; }
    if (tick == 2u) {
        assert(s_tracking_saves == 1u && !s_tracking_enabled && s_receipts_saves == 0u);
        expect_message(0, MODEM_TOPIC_STATUS, "\"status\"");
        s_fail_receipts_save = false;
        s_now_ms = 1100u;
    }
    if (tick == 3u) {
        assert(s_receipts_saves == 1u && strcmp(s_receipts.id[0], "17") == 0);
        expect_message(1, MODEM_TOPIC_CMD_ACK, "\"status\":\"acknowledged\"");
        s_command = "{\"command_id\":\"17\",\"command\":\"enable_tracking\",\"params\":{\"enabled\":true}}";
    }
    if (tick == 4u) {
        expect_message(2, MODEM_TOPIC_CMD_ACK, "\"status\":\"acknowledged\"");
        assert(s_tracking_saves == 1u && s_receipts_saves == 1u);
        finish();
    }
}

static void restart_flow(unsigned tick)
{
    if (tick == 1u) { s_command = k_restart_cmd; }
    if (tick == 2u) {
        expect_message(0, MODEM_TOPIC_CMD_ACK, "\"command_id\":\"30\"");
        assert(s_receipts_saves == 1u && strcmp(s_restart_intent.id, "30") == 0);
        s_now_ms = strcmp(s_case_name, "restart_ack") == 0 ? 19000u : 20000u;
    }
    if (tick == 3u) {
        assert(!s_restart_called);
        if (strcmp(s_case_name, "restart_ack") == 0) { ack(true); }
        s_expected_restart_at_ms = s_now_ms;
    }
}

static const char k_ota_cmd[] =
    "{\"command_id\":\"28\",\"command\":\"ota_update\",\"params\":{"
    "\"url\":\"https://example.test/fw.bin\",\"version\":\"3.0.0\",\"jobId\":\"job-1\",\"size\":100,"
    "\"sha256\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\"}}";

static void sleep_blocked(unsigned tick)
{
    bool is_ota = strcmp(s_case_name, "sleep_blocked_by_ota") == 0;
    bool is_restart = strcmp(s_case_name, "sleep_blocked_by_restart") == 0;
    if (tick == 1u) { power_sample(false); }
    if (tick == 5u) {
        s_now_ms = 19000u;
        if (is_restart) { s_ack_automatically = false; }
        s_command = is_ota ? k_ota_cmd : is_restart ? k_restart_cmd :
            "{\"command_id\":\"25\",\"command\":\"request_location\"}";
    }
    if (tick == 6u) {
        assert(s_sleep_calls == 0u);
        if (is_ota) { assert(s_ota_starts == 1u); }
        if (!is_ota && !is_restart) { assert(s_gnss_enabled); }
        s_now_ms = 21000u;
    }
    if (tick == 7u) {
        assert(s_sleep_calls == 0u);
        if (is_restart) {
            ack(true);
            s_expected_restart_at_ms = s_now_ms;
        } else if (is_ota) {
            s_progress_ready = true;
        } else {
            s_now_ms = 110000u;
        }
    }
    if (tick == 11u) {
        assert(s_sleep_calls > 0u);
        finish();
    }
}

static void seed_offline_head(void)
{
    s_offline_count = 1;
    s_offline_head = (ivts_record_t){ .boot_id = BOOT_ID - 1u, .seq = 11u, .uptime_ms = 700u };
}

static void seed_boundary(void)
{
    s_session.count = 1;
    s_session.outbox[0] = (ivts_session_boundary_t){
        .kind = IVTS_BOUNDARY_ENDED, .boot_id = BOOT_ID - 1u, .seq = 12u,
        .session = { .boot_id = BOOT_ID - 1u, .local_key = 10u },
    };
}

static void seed_ota_context(const char *target)
{
    s_ota_context = (ivts_ota_pending_t){ .pending = true, .timeout_s = 60u, .job_id = "job-1",
                                          .target_partition = "ota_1" };
    assert(strlen(target) < sizeof s_ota_context.target_version);
    strcpy(s_ota_context.target_version, target);
}

static void seed_scenario(const char *name)
{
    if (strncmp(name, "raw_", 4u) == 0) {
        s_before_tick = raw_flow;
        s_session.active = (ivts_session_id_t){ .boot_id = BOOT_ID, .local_key = 10u };
        s_ack_automatically = true;
        if (strcmp(name, "raw_live_ack_error") == 0) {
            s_reject_publish = true;
            s_ack_automatically = false;
        }
        if (strcmp(name, "raw_broker_down") == 0) { s_link = IVTS_LINK_DOWN; }
        if (strcmp(name, "raw_queue_before_live") == 0) { seed_offline_head(); }
        if (strcmp(name, "raw_boundary_before_live") == 0) {
            seed_boundary();
            s_ack_automatically = false;
        }
        return;
    }
    if (strcmp(name, "replay_and_control_order") == 0) {
        s_before_tick = replay_and_control_order;
        s_alarm = (ivts_motion_alarm_t){ .boot_id = BOOT_ID - 1u, .seq = 9u };
        seed_offline_head();
        seed_boundary();
        return;
    }
    if (strncmp(name, "ota_boot_", 9u) == 0) {
        s_before_tick = ota_boot;
        if (strcmp(name, "ota_boot_normal") != 0) {
            seed_ota_context(strcmp(name, "ota_boot_landed") == 0 ? "2.0.0" : "3.0.0");
        }
        return;
    }
    if (strcmp(name, "ota_confirm") == 0 || strcmp(name, "ota_deadline") == 0) {
        s_before_tick = ota_confirmation;
        s_alarm = (ivts_motion_alarm_t){ .boot_id = BOOT_ID - 1u, .seq = 9u };
        s_image_pending_verify = true;
        seed_ota_context("2.0.0");
        return;
    }
    if (strcmp(name, "command_receipts") == 0) {
        s_before_tick = command_receipts;
        s_ack_automatically = true;
        s_fail_receipts_save = true;
        return;
    }
    if (strncmp(name, "restart_", 8u) == 0) {
        s_before_tick = restart_flow;
        return;
    }
    if (strncmp(name, "sleep_blocked_by_", 17u) == 0) {
        s_before_tick = sleep_blocked;
        s_ack_automatically = true;
        return;
    }
    assert(false);
}

int main(int argc, char **argv)
{
    assert(argc == 2);
    s_case_name = argv[1];
    seed_scenario(s_case_name);
    if (setjmp(s_task_exit) == 0) {
        app_start();
        assert(s_task != NULL);
        s_task(NULL);
        assert(false);
    }
    assert(s_restart_called == (s_expected_restart_at_ms != 0u));
    return 0;
}
