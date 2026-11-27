/**
 * @file app_cmd.c
 * @brief Xử lý command từ cloud và giữ ACK đến khi broker xác nhận.
 *
 * Định dạng command:
 *
 *     {"command_id":"...","command":"...","params":{...}}
 *
 * Command là dữ liệu từ ngoài vào nên không được tin: json_reader giới hạn số token và độ sâu,
 * mọi trường được kiểm kiểu và độ dài trước khi dùng.
 *
 * ## Mô hình thực thi
 *
 * app_cmd_handle() chạy trong task "app" và lấy command từ modem. s_js và s_tok là
 * bộ đệm static dùng riêng cho task "app", không có truy cập đồng thời.
 *
 * Lệnh thành công được lưu vào NVS trước khi gửi ACK. Gửi lại ID trong cửa sổ lưu chỉ
 * nhận ACK. Truy vấn vị trí đợi PUBACK của mẫu GNSS trước khi báo thành công.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * update_config chỉ ghi vào g_app.cfg sau khi storage_config_save() thành công, nên mất nguồn
 * giữa chừng để lại cấu hình cũ hoặc mới nguyên vẹn, không bao giờ nửa cũ nửa mới.
 */

#include "app_priv.h"
#include "publish/messages.h"
#include "publish/outbox.h"
#include "session/session_tracker.h"
#include "fw_update/fw_update.h"
#include "app_timing.h"
#include <string.h>
#include "esp_log.h"
#include "platform/platform_reset.h"
#include "ivts_core/base/str.h"
#include "ivts_core/payload/json_reader.h"
#include "ivts_core/payload/meta.h"
#include "modem/modem.h"
#include "ota/ota.h"
#include "storage/storage.h"

#define MAX_TOK 64   /* Số token JSON tối đa của một command. */

static char s_js[MODEM_CMD_MAX];       /* Nội dung command đã lấy từ modem. */
static ivts_jtok_t s_tok[MAX_TOK];     /* Token của s_js. */
typedef struct {
    char id[STORAGE_COMMAND_ID_SIZE];
    const char *status;
    const char *response;
} command_ack_t;

static command_ack_t s_ack;
static storage_command_receipts_t s_receipts;
static bool s_receipts_ready;
static bool s_checkpoint_pending;
static bool s_restart_requested;
static uint64_t s_retry_at;
static uint64_t s_restart_at;
static uint64_t s_location_deadline;
static bool s_location_inflight;

static bool load_receipts(void)
{
    ivts_err_t e = storage_command_receipts_load(&s_receipts);
    if (e != IVTS_OK && e != IVTS_ERR_NOT_FOUND) {
        ESP_LOGW(APP_TAG, "command receipts NVS: %s", ivts_err_name(e));
        return false;
    }
    return true;
}

void app_cmd_init(void)
{
    s_ack = (command_ack_t){0};
    s_checkpoint_pending = false;
    s_restart_requested = false;
    s_retry_at = 0;
    s_restart_at = 0;
    s_location_deadline = 0;
    s_location_inflight = false;
    s_receipts_ready = load_receipts();
}

static void complete(const char *reason)
{
    s_ack.response = reason;
    s_ack.status = reason == NULL ? "acknowledged" : "failed";
    if (reason == NULL) {
        memcpy(s_receipts.id[s_receipts.next], s_ack.id, sizeof s_ack.id);
        s_receipts.next = (uint8_t)((s_receipts.next + 1u) % STORAGE_COMMAND_RECEIPTS);
        s_checkpoint_pending = true;
    }
}

/** Đọc trường chuỗi @p key của object @p obj vào @p out. @return true nếu có và hợp lệ. */
static bool get_str(int n, int obj, const char *key, char *out, size_t cap)
{
    int i = ivts_json_find(s_js, s_tok, n, obj, key);
    return i >= 0 && ivts_json_get_str(s_js, &s_tok[i], out, cap) == IVTS_OK;
}

/** Đọc trường số nguyên không dấu 32 bit. @return true nếu có và hợp lệ. */
static bool get_decimal(int n, int obj, const char *key, uint64_t limit, uint64_t *out)
{
    int i = ivts_json_find(s_js, s_tok, n, obj, key);
    if (i < 0 || (s_tok[i].type != IVTS_JT_PRIM && s_tok[i].type != IVTS_JT_STR) ||
        s_tok[i].start == s_tok[i].end) { return false; }
    uint64_t value = 0u;
    for (size_t pos = s_tok[i].start; pos < s_tok[i].end; pos++) {
        char c = s_js[pos];
        if (c < '0' || c > '9') { return false; }
        uint64_t digit = (uint64_t)(c - '0');
        if (digit > limit || value > (limit - digit) / 10u) { return false; }
        value = value * 10u + digit;
    }
    *out = value;
    return true;
}

/**
 * Cập nhật trường cấu hình số nguyên nếu trường có mặt và hợp lệ.
 */
static bool config_u16(int n, int obj, const char *key, uint16_t *out, bool *present)
{
    if (ivts_json_find(s_js, s_tok, n, obj, key) < 0) { return true; }
    uint64_t v;
    if (!get_decimal(n, obj, key, UINT16_MAX, &v)) { return false; }
    *out = (uint16_t)v;
    *present = true;
    return true;
}

/** Đọc trường boolean. @return true nếu có và hợp lệ. */
static bool get_bool(int n, int obj, const char *key, bool *out)
{
    int i = ivts_json_find(s_js, s_tok, n, obj, key);
    return i >= 0 && ivts_json_get_bool(s_js, &s_tok[i], out) == IVTS_OK;
}

static bool config_bool(int n, int obj, const char *key, bool *out, bool *present)
{
    if (ivts_json_find(s_js, s_tok, n, obj, key) < 0) { return true; }
    if (!get_bool(n, obj, key, out)) { return false; }
    *present = true;
    return true;
}

/**
 * @brief Xử lý command ota_update.
 * @return NULL nếu đã nhận; ngược lại là mã lý do từ chối gửi lại cloud.
 */
static bool validate_ota_url(const char *url)
{
    return !(strncmp(url, "https://", 8u) != 0 || url[8] == '\0' ||
        strpbrk(url, "\"\\\r\n\t ") != NULL);
}

static uint32_t clamp_confirm_timeout(uint64_t t)
{
    if (t < IVTS_OTA_CONFIRM_MIN_S) { t = IVTS_OTA_CONFIRM_MIN_S; }
    if (t > IVTS_OTA_CONFIRM_MAX_S) { t = IVTS_OTA_CONFIRM_MAX_S; }
    return (uint32_t)t;
}

static const char *parse_ota_manifest(int n, int params, ivts_ota_cmd_t *cmd)
{
    uint64_t size;
    uint8_t digest[32];
    if (!get_str(n, params, "url", cmd->url, sizeof cmd->url) ||
        !get_str(n, params, "sha256", cmd->sha256_hex, sizeof cmd->sha256_hex) ||
        ivts_sha256_hex_decode(cmd->sha256_hex, digest) != IVTS_OK ||
        !get_str(n, params, "version", cmd->version, sizeof cmd->version) || cmd->version[0] == '\0' ||
        !get_decimal(n, params, "size", UINT32_MAX, &size) || size == 0u) {
        return "invalid_manifest";
    }
    if (!validate_ota_url(cmd->url)) { return "invalid_url"; }
    if (!get_str(n, params, "jobId", cmd->job_id, sizeof cmd->job_id) &&
        !get_str(n, params, "job_id", cmd->job_id, sizeof cmd->job_id)) { return "invalid_job_id"; }
    if (cmd->job_id[0] == '\0') { return "invalid_job_id"; }
    cmd->size = (uint32_t)size;
    if (ivts_json_find(s_js, s_tok, n, params, "force") >= 0 && !get_bool(n, params, "force", &cmd->force)) {
        return "invalid_force";
    }
    uint64_t t = IVTS_OTA_CONFIRM_DEFAULT_S;
    const char *timeout_key = ivts_json_find(s_js, s_tok, n, params, "confirmTimeoutSec") >= 0
                            ? "confirmTimeoutSec" : "confirm_timeout_sec";
    if (ivts_json_find(s_js, s_tok, n, params, timeout_key) >= 0 &&
        !get_decimal(n, params, timeout_key, UINT32_MAX, &t)) {
        return "invalid_confirm_timeout";
    }
    cmd->confirm_timeout_s = clamp_confirm_timeout(t);
    return NULL;
}

static const char *do_ota(int n, int params)
{
    ivts_ota_cmd_t cmd;
    memset(&cmd, 0, sizeof cmd);
    const char *reason = parse_ota_manifest(n, params, &cmd);
    return reason != NULL ? reason : app_fw_update_try_start(&cmd);
}

/**
 * @brief Xử lý command update_config.
 *
 * Chỉ các trường chính sách được thay đổi qua cloud; định danh và credential không đổi được
 * qua MQTT. Cấu hình mới được kiểm tra và lưu vào NVS trước khi áp dụng vào g_app.cfg.
 *
 * @return NULL nếu đã áp dụng; ngược lại là mã lý do từ chối.
 */
static const char *do_config(int n, int params)
{
    ivts_config_t c = g_app.cfg;
    bool present = false;
    if (!config_u16(n, params, "tracking_interval_s", &c.tracking_interval_s, &present) ||
        !config_u16(n, params, "heartbeat_interval_s", &c.heartbeat_interval_s, &present) ||
        !config_u16(n, params, "alarm_interval_s", &c.alarm_interval_s, &present) ||
        !config_u16(n, params, "alarm_timeout_s", &c.alarm_timeout_s, &present) ||
        !config_u16(n, params, "ignition_off_hold_ms", &c.ignition_off_hold_ms, &present) ||
        !config_u16(n, params, "ota_min_battery_mv", &c.ota_min_battery_mv, &present) ||
        !config_u16(n, params, "ignition_adc_threshold_mv", &c.ignition_adc_threshold_mv, &present) ||
        !config_bool(n, params, "sleep_enabled", &c.sleep_enabled, &present) ||
        !config_bool(n, params, "imu_wakeup_enabled", &c.imu_wakeup_enabled, &present) ||
        !present || ivts_config_validate(&c, NULL, 0) != 0u) {
        return "invalid_config";
    }
    if (storage_config_save(&c) != IVTS_OK) { return "persist_failed"; }
    g_app.cfg = c;
    app_apply_config();
    return NULL;
}

static const char *do_tracking(int n, int params)
{
    bool enabled;
    if (!get_bool(n, params, "enabled", &enabled)) { return "invalid_enabled"; }
    if (enabled == g_app.tracking_enabled) { return NULL; }
    if (storage_tracking_save(enabled) != IVTS_OK) { return "persist_failed"; }
    g_app.tracking_enabled = enabled;
    app_outbox_request_status();
    return NULL;
}

static const char *do_assignment(int n, int params)
{
    uint64_t local, canonical;
    char boot[IVTS_BOOT_ID_SIZE];
    if (!get_decimal(n, params, "local_session_key", UINT32_MAX, &local) ||
        !get_decimal(n, params, "canonical_session_id", IVTS_SESSION_MAX_CANONICAL_ID, &canonical) ||
        !get_str(n, params, "boot_id", boot, sizeof boot)) { return "invalid_session"; }
    bool active_changed;
    if (!app_session_assign((uint32_t)local, boot, canonical, &active_changed)) { return "session_not_current"; }
    if (active_changed) { app_outbox_request_status(); }
    return NULL;
}

static const char *load_restart_intent(storage_restart_intent_t *intent, const char *id, bool *same)
{
    ivts_err_t error = storage_restart_intent_load(intent);
    if (error != IVTS_OK && error != IVTS_ERR_NOT_FOUND) { return "dedupe_unavailable"; }
    *same = error == IVTS_OK && strcmp(intent->id, id) == 0;
    return NULL;
}

static bool is_duplicate_restart(const storage_restart_intent_t *intent, bool rollback, const char *running)
{
    return !rollback || intent->rollback_origin[0] == '\0' ||
           strcmp(intent->rollback_origin, running) != 0;
}

static const char *check_restart_preconditions(bool rollback)
{
    if (app_fw_update_blocks_restart(rollback)) { return "ota_busy"; }
    if (rollback && g_app.axes.ign != IVTS_IGN_OFF) { return "unsafe_runtime_window"; }
    if (rollback && !ota_can_rollback()) { return "no_rollback_image"; }
    return NULL;
}

static const char *persist_restart_intent(const char *id, bool rollback, const char *running)
{
    storage_restart_intent_t intent = {0};
    (void)ivts_str_copy(intent.id, sizeof intent.id, id);
    if (rollback && ivts_str_copy(intent.rollback_origin, sizeof intent.rollback_origin, running) != IVTS_OK) {
        return "no_rollback_image";
    }
    if (storage_restart_intent_save(&intent) != IVTS_OK) { return "persist_failed"; }
    return NULL;
}

static const char *do_restart(const char *id, bool rollback)
{
    storage_restart_intent_t intent;
    bool same;
    const char *reason = load_restart_intent(&intent, id, &same);
    if (reason != NULL) { return reason; }
    const char *running = ota_running_partition();
    if (rollback && running[0] == '\0') { return "no_rollback_image"; }
    if (same && is_duplicate_restart(&intent, rollback, running)) { return NULL; }

    reason = check_restart_preconditions(rollback);
    if (reason != NULL) { return reason; }
    if (!same) {
        reason = persist_restart_intent(id, rollback, running);
        if (reason != NULL) { return reason; }
    }
    /* Nếu mất nguồn sau khi lưu ý định, chỉ thử lại rollback khi vẫn ở slot gốc. */
    if (rollback) {
        if (ota_schedule_rollback() != IVTS_OK) { return "no_rollback_image"; }
        app_fw_update_cancel_confirmation();
    }
    s_restart_requested = true;
    return NULL;
}

static bool get_command_id(int n, char id[STORAGE_COMMAND_ID_SIZE])
{
    int i = ivts_json_find(s_js, s_tok, n, 0, "command_id");
    if (i < 0) { i = ivts_json_find(s_js, s_tok, n, 0, "commandId"); }
    if (i < 0) { return false; }
    if (s_tok[i].type == IVTS_JT_STR) {
        if (ivts_json_get_str(s_js, &s_tok[i], id, STORAGE_COMMAND_ID_SIZE) != IVTS_OK) { id[0] = '\0'; }
    } else if (s_tok[i].type == IVTS_JT_PRIM) {
        size_t len = (size_t)(s_tok[i].end - s_tok[i].start);
        const char *raw = &s_js[s_tok[i].start];
        if (len == 0u || len >= STORAGE_COMMAND_ID_SIZE || raw[0] == '0') { return true; }
        for (size_t j = 0; j < len; j++) {
            if (raw[j] < '0' || raw[j] > '9') { return true; }
        }
        memcpy(id, raw, len);
    }
    return true;
}

/** Lấy lệnh từ modem khi ACK trước đó đã được xử lý. */
typedef struct {
    char id[STORAGE_COMMAND_ID_SIZE];
    char name[32];
    int params;
    bool has_id;
    bool has_name;
    bool has_params;
} command_envelope_t;

static int take_and_parse_command(void)
{
    size_t len = 0;
    if (modem_cmd_take(s_js, sizeof s_js, &len) != IVTS_OK) { return 0; }
    int n = ivts_json_parse(s_js, len, s_tok, MAX_TOK, 4);
    return n > 0 && s_tok[0].type == IVTS_JT_OBJ ? n : 0;
}

static void read_command_envelope(int n, command_envelope_t *envelope)
{
    envelope->has_id = get_command_id(n, envelope->id);
    envelope->has_name = get_str(n, 0, "command", envelope->name, sizeof envelope->name) &&
                         envelope->name[0] != '\0';
    envelope->params = ivts_json_find(s_js, s_tok, n, 0, "params");
    envelope->has_params = envelope->params >= 0 && s_tok[envelope->params].type == IVTS_JT_OBJ;
}

static void handle_internal_assignment(int n, const command_envelope_t *envelope)
{
    if (!envelope->has_id && envelope->has_name && envelope->has_params &&
        strcmp(envelope->name, "assign_session") == 0) {
        (void)do_assignment(n, envelope->params);
    }
}

static bool is_already_acknowledged(const char *id)
{
    for (size_t i = 0; i < STORAGE_COMMAND_RECEIPTS; i++) {
        if (strcmp(s_receipts.id[i], id) == 0) { return true; }
    }
    return false;
}

static void dispatch_command(int n, const command_envelope_t *envelope)
{
    if (!envelope->has_name) {
        complete("malformed");
        return;
    }
    const char *reason = "unknown_command";
    if (strcmp(envelope->name, "ota_update") == 0) {
        reason = envelope->has_params ? do_ota(n, envelope->params) : "missing_params";
    }
    else if (strcmp(envelope->name, "update_config") == 0)   { reason = envelope->has_params ? do_config(n, envelope->params) : "missing_params"; }
    else if (strcmp(envelope->name, "enable_tracking") == 0){ reason = envelope->has_params ? do_tracking(n, envelope->params) : "missing_params"; }
    else if (strcmp(envelope->name, "assign_session") == 0) { reason = envelope->has_params ? do_assignment(n, envelope->params) : "missing_params"; }
    else if (strcmp(envelope->name, "request_location") == 0) {
        s_location_deadline = app_now() + LOCATION_TIMEOUT_MS;
        return;
    }
    else if (strcmp(envelope->name, "reboot") == 0 || strcmp(envelope->name, "ota_rollback") == 0 ||
             strcmp(envelope->name, "manual_rollback") == 0) {
        reason = do_restart(envelope->id, strcmp(envelope->name, "reboot") != 0);
    }
    complete(reason);
}

void app_cmd_handle(void)
{
    if (app_cmd_pending()) { return; }
    int n = take_and_parse_command();
    if (n == 0) { return; }
    command_envelope_t envelope = {0};
    read_command_envelope(n, &envelope);
    if (envelope.id[0] == '\0') {
        handle_internal_assignment(n, &envelope);
        return;
    }

    s_ack = (command_ack_t){0};
    memcpy(s_ack.id, envelope.id, sizeof s_ack.id);
    if (!s_receipts_ready) { s_receipts_ready = load_receipts(); }
    if (!s_receipts_ready) { complete("dedupe_unavailable"); return; }
    if (is_already_acknowledged(envelope.id)) {
        s_ack.status = "acknowledged";
        return;
    }
    dispatch_command(n, &envelope);
}

bool app_cmd_pending(void)
{
    return s_ack.id[0] != '\0';
}

bool app_cmd_needs_gnss(void)
{
    return s_location_deadline != 0u;
}

bool app_cmd_blocks_sleep(void)
{
    return app_cmd_needs_gnss() || s_restart_requested || s_restart_at != 0u;
}

void app_cmd_on_location_ack(bool ok)
{
    if (!s_location_inflight) { return; }
    s_location_inflight = false;
    s_location_deadline = 0;
    complete(ok ? NULL : "location_publish_failed");
}

void app_cmd_on_ack(bool ok)
{
    if (!ok) {
        s_retry_at = app_now() + ACK_RETRY_MS;
        return;
    }
    s_ack = (command_ack_t){0};
    s_retry_at = 0;
    if (s_restart_at != 0u) {
        s_restart_at = 0;
        platform_restart("cmd_restart");
    }
}

static void tick_location_request(uint64_t now)
{
    if (s_location_deadline != 0u && !s_location_inflight) {
        bool fixed = app_state_get()->gnss.fix_valid;
        if (now >= s_location_deadline) {
            s_location_deadline = 0;
            complete(fixed ? "location_publish_timeout" : "location_unavailable");
        } else if (fixed) {
            s_location_inflight = app_messages_publish_location();
        }
    }
}

static bool flush_receipts_checkpoint(uint64_t now)
{
    if (s_checkpoint_pending) {
        if (storage_command_receipts_save(&s_receipts) != IVTS_OK) {
            s_retry_at = now + ACK_RETRY_MS;
            return false;
        }
        s_checkpoint_pending = false;
        if (s_restart_requested) {
            s_restart_requested = false;
            s_restart_at = now + CMD_RESTART_DELAY_MS;
        }
    }
    return true;
}

static void send_pending_ack(uint64_t now)
{
    if (s_ack.status == NULL || now < s_retry_at) { return; }
    if (!flush_receipts_checkpoint(now)) { return; }
    (void)app_messages_publish_command_ack(s_ack.id, s_ack.status, s_ack.response);
}

void app_cmd_tick(void)
{
    uint64_t now = app_now();
    if (s_restart_at != 0u && now >= s_restart_at) { platform_restart("cmd_restart_timeout"); }
    tick_location_request(now);
    send_pending_ack(now);
}
