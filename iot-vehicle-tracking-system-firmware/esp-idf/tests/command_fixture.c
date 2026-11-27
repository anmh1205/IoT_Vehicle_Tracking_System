#include <assert.h>
#include <string.h>
#include "app_priv.h"
#include "esp_system.h"
#include "ivts_core/payload/json_reader.h"
#include "modem_priv.h"
#include "ota/ota.h"
#include "storage/storage.h"

app_t g_app;
static uint64_t s_now = 1u;
QueueHandle_t g_modem_q = &s_now;

static storage_command_receipts_t s_saved_receipts;
static bool s_read_fails, s_write_fails, s_cloud_available = true;
static storage_restart_intent_t s_restart_intent;
static unsigned s_ack_count, s_location_count, s_config_writes, s_restarts;
static const char *s_running_slot = "factory";
static bool s_rollback_available, s_rollback_write_fails;
static unsigned s_rollback_attempts;
static const char *s_ack_status, *s_ack_reason;
static ivts_telemetry_t s_telemetry;

uint64_t app_now(void) { return s_now; }
const ivts_telemetry_t *app_state_get(void) { return &s_telemetry; }
void app_apply_config(void) {}
void esp_restart(void) { s_restarts++; }
esp_err_t modem_os_start(void) { return ESP_OK; }

int xQueueSend(QueueHandle_t queue, const void *item, unsigned ticks)
{
    (void)ticks;
    assert(queue == g_modem_q && item != NULL);
    return pdTRUE;
}

static ivts_err_t event_sink(void *ctx, const ivts_event_t *ev)
{
    (void)ctx;
    assert(ev->type == IVTS_EV_CMD_PENDING);
    return IVTS_OK;
}

bool app_publish_ack_cmd(const char *id, const char *status, const char *reason)
{
    assert(id[0] != '\0' && status != NULL);
    if (!s_cloud_available) { return false; }
    s_ack_count++;
    s_ack_status = status;
    s_ack_reason = reason;
    return true;
}

bool app_publish_location(void)
{
    if (!s_cloud_available) { return false; }
    s_location_count++;
    return true;
}

bool app_session_assign(uint32_t key, const char *boot, uint64_t canonical)
{
    (void)key;
    (void)boot;
    (void)canonical;
    assert(false && "unexpected session assignment");
    return false;
}

ivts_err_t storage_config_save(const ivts_config_t *c)
{
    assert(ivts_config_validate(c, NULL, 0u) == 0u);
    s_config_writes++;
    return IVTS_OK;
}

ivts_err_t storage_tracking_save(bool enabled)
{
    (void)enabled;
    return IVTS_OK;
}

ivts_err_t storage_command_receipts_load(storage_command_receipts_t *out)
{
    if (s_read_fails) { return IVTS_ERR_IO; }
    *out = s_saved_receipts;
    return out->next != 0u || out->id[0][0] != '\0' ? IVTS_OK : IVTS_ERR_NOT_FOUND;
}

ivts_err_t storage_command_receipts_save(const storage_command_receipts_t *in)
{
    if (s_write_fails) { return IVTS_ERR_IO; }
    s_saved_receipts = *in;
    return IVTS_OK;
}

ivts_err_t storage_restart_intent_load(storage_restart_intent_t *out)
{
    *out = s_restart_intent;
    return s_restart_intent.id[0] == '\0' ? IVTS_ERR_NOT_FOUND : IVTS_OK;
}

ivts_err_t storage_restart_intent_save(const storage_restart_intent_t *intent)
{
    s_restart_intent = *intent;
    return IVTS_OK;
}

const char *ota_running_version(void) { return "v1"; }
const char *ota_running_partition(void) { return s_running_slot; }
bool ota_can_rollback(void) { return s_rollback_available; }
ivts_err_t ota_schedule_rollback(void)
{
    s_rollback_attempts++;
    assert(ota_can_rollback());
    assert(strcmp(s_restart_intent.rollback_origin, s_running_slot) == 0);
    return s_rollback_write_fails ? IVTS_ERR_IO : IVTS_OK;
}

ivts_err_t ota_start(const ivts_ota_cmd_t *cmd, uint16_t battery_mv, uint16_t min_battery_mv)
{
    (void)cmd;
    (void)battery_mv;
    (void)min_battery_mv;
    assert(false && "unexpected OTA");
    return IVTS_ERR_FAIL;
}

static void receive(const char *json)
{
    modem_cmd_store(json, strlen(json));
    app_cmd_handle();
}

static void ack(const char *status, const char *reason)
{
    unsigned before = s_ack_count;
    app_cmd_tick();
    assert(s_ack_count == before + 1u && strcmp(s_ack_status, status) == 0);
    assert(reason == NULL ? s_ack_reason == NULL : strcmp(s_ack_reason, reason) == 0);
    app_cmd_on_ack(true);
    assert(!app_cmd_pending());
}

static void check_receipts(void)
{
    const char *first = "{\"command_id\":\"41\",\"command\":\"update_config\",\"params\":{\"tracking_interval_s\":\"5\"}}";
    s_write_fails = true;
    receive(first);
    assert(g_app.cfg.tracking_interval_s == 5u && s_config_writes == 1u);
    app_cmd_tick();
    assert(s_ack_count == 0u && app_cmd_pending());
    s_write_fails = false;
    s_now += 1000u;
    ack("acknowledged", NULL);

    app_cmd_init();
    receive("{\"command_id\":42,\"command\":\"update_config\",\"params\":{\"tracking_interval_s\":7}}");
    ack("acknowledged", NULL);
    app_cmd_init();
    receive(first);
    ack("acknowledged", NULL);
    assert(g_app.cfg.tracking_interval_s == 7u && s_config_writes == 2u);

    s_read_fails = true;
    app_cmd_init();
    receive("{\"command_id\":43,\"command\":\"enable_tracking\",\"params\":{\"enabled\":false}}");
    ack("failed", "dedupe_unavailable");
    assert(g_app.tracking_enabled);
    s_read_fails = false;
    receive("{\"command_id\":43,\"command\":\"enable_tracking\",\"params\":{\"enabled\":false}}");
    ack("acknowledged", NULL);
    assert(!g_app.tracking_enabled);
}

static void check_location(void)
{
    const char *first = "{\"command_id\":77,\"command\":\"request_location\"}";
    receive(first);
    app_cmd_tick();
    assert(app_cmd_blocks_sleep() && s_ack_count == 0u && s_location_count == 0u);
    assert(app_cmd_needs_gnss());
    s_now += 45000u;
    app_cmd_tick();
    assert(app_cmd_blocks_sleep() && s_ack_count == 0u && s_location_count == 0u);
    s_telemetry.gnss.fix_valid = true;
    app_cmd_tick();
    app_cmd_tick();
    assert(s_location_count == 1u && s_ack_count == 0u);
    app_cmd_on_location_ack(true);
    ack("acknowledged", NULL);
    assert(!app_cmd_blocks_sleep());
    assert(!app_cmd_needs_gnss());
    app_cmd_init();
    receive(first);
    ack("acknowledged", NULL);
    assert(s_location_count == 1u);

    s_telemetry.gnss.fix_valid = false;
    receive("{\"command_id\":78,\"command\":\"request_location\"}");
    s_now += 90001u;
    ack("failed", "location_unavailable");
    assert(s_location_count == 1u);
    assert(!app_cmd_needs_gnss());
    s_telemetry.gnss.fix_valid = true;
    receive("{\"command_id\":79,\"command\":\"request_location\"}");
    app_cmd_tick();
    app_cmd_on_location_ack(false);
    ack("failed", "location_publish_failed");
}

static void check_reboot(void)
{
    const char *command = "{\"command_id\":80,\"command\":\"reboot\"}";
    s_write_fails = true;
    receive(command);
    app_cmd_tick();
    s_now += 21000u;
    app_cmd_tick();
    assert(s_restarts == 0u && s_ack_count == 0u);
    s_write_fails = false;
    s_now += 1000u;
    ack("acknowledged", NULL);
    assert(s_restarts == 1u);
    app_cmd_init();
    receive(command);
    ack("acknowledged", NULL);
    assert(s_restarts == 1u);
}

static void check_fifo(void)
{
    for (char value = 'a'; value <= 'e'; value++) {
        modem_cmd_store(&value, sizeof value);
    }
    assert(modem_cmd_dropped() == 1u);
    size_t len;
    char value;
    assert(modem_cmd_take(&value, 0u, &len) == IVTS_ERR_FULL);
    assert(modem_cmd_take(&value, 1u, &len) == IVTS_OK && len == 1u && value == 'a');
    modem_cmd_store("f", 1u);
    for (char next = 'b'; next <= 'd'; next++) {
        assert(modem_cmd_take(&value, 1u, &len) == IVTS_OK && len == 1u && value == next);
    }
    assert(modem_cmd_take(&value, 1u, &len) == IVTS_OK && len == 1u && value == 'f');
    g_modem.cfg.command_subscribe_enabled = false;
    modem_cmd_store("g", 1u);
    assert(modem_cmd_take(&value, 1u, &len) == IVTS_ERR_NOT_FOUND);
}

static void check_rollback(void)
{
    const char *command = "{\"command_id\":81,\"command\":\"manual_rollback\"}";
    g_app.axes.ign = IVTS_IGN_OFF;
    s_running_slot = "ota_1";
    s_rollback_available = true;
    s_rollback_write_fails = true;
    receive(command);
    ack("failed", "no_rollback_image");
    assert(s_rollback_attempts == 1u && s_restarts == 0u);

    app_cmd_init();
    s_rollback_write_fails = false;
    receive(command);
    assert(s_rollback_attempts == 2u);
    /* Mất nguồn sau khi bootloader đã đổi slot nhưng trước khi lưu kết quả command. */
    app_cmd_init();
    s_running_slot = "ota_0";
    receive(command);
    ack("acknowledged", NULL);
    assert(s_rollback_attempts == 2u && s_restarts == 0u);
}

static void check_validation(void)
{
    ivts_jtok_t token[4];
    static const char *const invalid[] = {"01", "1.", "-", "1e+", "1a", "1+2"};
    for (size_t i = 0; i < sizeof invalid / sizeof invalid[0]; i++) {
        assert(ivts_json_parse(invalid[i], strlen(invalid[i]), token, 4u, 4u) < 0);
    }
    const char *number = "-0.3E-10";
    assert(ivts_json_parse(number, strlen(number), token, 4u, 4u) == 1);
    receive("{\"command_id\":1,\"command\":\"update_config\",\"params\":{\"mqtt_host\":\"new.host\"}}");
    ack("failed", "invalid_config");
    assert(s_config_writes == 0u);

    receive("{\"command_id\":\"12345678901234567890123456789012345678901234567890\",\"command\":\"reboot\"}");
    assert(!app_cmd_pending() && s_restart_intent.id[0] == '\0');
    receive("{\"command_id\":false,\"command\":\"assign_session\",\"params\":{\"local_session_key\":1,"
            "\"canonical_session_id\":2,\"boot_id\":\"00000001\"}}");
    assert(!app_cmd_pending());
}

int main(int argc, char **argv)
{
    assert(argc == 2);
    modem_cfg_t modem = {.sink = {.fn = event_sink}, .client_id = "tracker", .device_id = "tracker",
                         .command_subscribe_enabled = true};
    assert(modem_init(&modem) == IVTS_OK);
    ivts_config_defaults(&g_app.cfg);
    strcpy(g_app.cfg.device_id, "tracker");
    strcpy(g_app.cfg.auth_token, "test");
    strcpy(g_app.cfg.mqtt_host, "broker.test");
    strcpy(g_app.cfg.apn, "example");
    g_app.cfg.mqtt_port = 8883u;
    g_app.tracking_enabled = true;
    app_cmd_init();
    if (strcmp(argv[1], "receipts") == 0) { check_receipts(); }
    else if (strcmp(argv[1], "location") == 0) { check_location(); }
    else if (strcmp(argv[1], "reboot") == 0) { check_reboot(); }
    else if (strcmp(argv[1], "rollback") == 0) { check_rollback(); }
    else if (strcmp(argv[1], "fifo") == 0) { check_fifo(); }
    else if (strcmp(argv[1], "validation") == 0) { check_validation(); }
    else { assert(false && "unknown test case"); }
    return 0;
}
