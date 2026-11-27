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
static const char *do_ota(int n, int params)
{
    ivts_ota_cmd_t c;
    memset(&c, 0, sizeof c);
    uint64_t size;
    uint8_t digest[32];
    if (!get_str(n, params, "url", c.url, sizeof c.url) ||
        !get_str(n, params, "sha256", c.sha256_hex, sizeof c.sha256_hex) ||
        ivts_sha256_hex_decode(c.sha256_hex, digest) != IVTS_OK ||
        !get_str(n, params, "version", c.version, sizeof c.version) || c.version[0] == '\0' ||
        !get_decimal(n, params, "size", UINT32_MAX, &size) || size == 0u) {
        return "invalid_manifest";
    }
    if (strncmp(c.url, "https://", 8u) != 0 || c.url[8] == '\0' ||
        strpbrk(c.url, "\"\\\r\n\t ") != NULL) { return "invalid_url"; }
    if (!get_str(n, params, "jobId", c.job_id, sizeof c.job_id) &&
        !get_str(n, params, "job_id", c.job_id, sizeof c.job_id)) { return "invalid_job_id"; }
    if (c.job_id[0] == '\0') { return "invalid_job_id"; }
    c.size = (uint32_t)size;
    if (ivts_json_find(s_js, s_tok, n, params, "force") >= 0 && !get_bool(n, params, "force", &c.force)) {
        return "invalid_force";
    }
    uint64_t t = IVTS_OTA_CONFIRM_DEFAULT_S;
    const char *timeout_key = ivts_json_find(s_js, s_tok, n, params, "confirmTimeoutSec") >= 0
                            ? "confirmTimeoutSec" : "confirm_timeout_sec";
    if (ivts_json_find(s_js, s_tok, n, params, timeout_key) >= 0 &&
        !get_decimal(n, params, timeout_key, UINT32_MAX, &t)) {
        return "invalid_confirm_timeout";
    }
    if (t < IVTS_OTA_CONFIRM_MIN_S) { t = IVTS_OTA_CONFIRM_MIN_S; }
    if (t > IVTS_OTA_CONFIRM_MAX_S) { t = IVTS_OTA_CONFIRM_MAX_S; }
    c.confirm_timeout_s = (uint32_t)t;
    return app_fw_update_try_start(&c);
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

static const char *do_restart(const char *id, bool rollback)
{
    storage_restart_intent_t intent;
    ivts_err_t e = storage_restart_intent_load(&intent);
    if (e != IVTS_OK && e != IVTS_ERR_NOT_FOUND) { return "dedupe_unavailable"; }
    bool same = e == IVTS_OK && strcmp(intent.id, id) == 0;
    const char *running = ota_running_partition();
    if (rollback && running[0] == '\0') { return "no_rollback_image"; }
    if (same && (!rollback || intent.rollback_origin[0] == '\0' ||
                 strcmp(intent.rollback_origin, running) != 0)) {
        return NULL;     /* Reboot đã xảy ra hoặc bootloader đã rời slot cần rollback. */
    }
    if (app_fw_update_blocks_restart(rollback)) { return "ota_busy"; }
    if (rollback && g_app.axes.ign != IVTS_IGN_OFF) { return "unsafe_runtime_window"; }
    if (rollback && !ota_can_rollback()) { return "no_rollback_image"; }
    if (!same) {
        intent = (storage_restart_intent_t){0};
        (void)ivts_str_copy(intent.id, sizeof intent.id, id);
        if (rollback && ivts_str_copy(intent.rollback_origin, sizeof intent.rollback_origin, running) != IVTS_OK) {
            return "no_rollback_image";
        }
        if (storage_restart_intent_save(&intent) != IVTS_OK) { return "persist_failed"; }
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
void app_cmd_handle(void)
{
    if (app_cmd_pending()) { return; }
    size_t len = 0;
    if (modem_cmd_take(s_js, sizeof s_js, &len) != IVTS_OK) { return; }
    int n = ivts_json_parse(s_js, len, s_tok, MAX_TOK, 4);
    if (n <= 0 || s_tok[0].type != IVTS_JT_OBJ) { return; }
    char cmd[32];
    command_ack_t ack = {0};
    bool has_id = get_command_id(n, ack.id);
    bool valid_cmd = get_str(n, 0, "command", cmd, sizeof cmd) && cmd[0] != '\0';
    int params = ivts_json_find(s_js, s_tok, n, 0, "params");
    bool is_object = params >= 0 && s_tok[params].type == IVTS_JT_OBJ;
    if (ack.id[0] == '\0') {
        /* Bridge gửi assign_session nội bộ không kèm command_id. */
        if (!has_id && valid_cmd && strcmp(cmd, "assign_session") == 0 && is_object) {
            (void)do_assignment(n, params);
        }
        return;
    }
    s_ack = ack;
    if (!s_receipts_ready) { s_receipts_ready = load_receipts(); }
    if (!s_receipts_ready) { complete("dedupe_unavailable"); return; }
    for (size_t i = 0; i < STORAGE_COMMAND_RECEIPTS; i++) {
        if (strcmp(s_receipts.id[i], ack.id) == 0) {
            s_ack.status = "acknowledged";
            return;
        }
    }

    if (!valid_cmd) {
        complete("malformed");
        return;
    }
    const char *reason = "unknown_command";
    if (strcmp(cmd, "ota_update") == 0) {
        reason = is_object ? do_ota(n, params) : "missing_params";
    }
    else if (strcmp(cmd, "update_config") == 0)   { reason = is_object ? do_config(n, params) : "missing_params"; }
    else if (strcmp(cmd, "enable_tracking") == 0){ reason = is_object ? do_tracking(n, params) : "missing_params"; }
    else if (strcmp(cmd, "assign_session") == 0) { reason = is_object ? do_assignment(n, params) : "missing_params"; }
    else if (strcmp(cmd, "request_location") == 0) {
        s_location_deadline = app_now() + LOCATION_TIMEOUT_MS;
        return;
    }
    else if (strcmp(cmd, "reboot") == 0 || strcmp(cmd, "ota_rollback") == 0 ||
             strcmp(cmd, "manual_rollback") == 0) {
        reason = do_restart(ack.id, strcmp(cmd, "reboot") != 0);
    }
    complete(reason);
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

void app_cmd_tick(void)
{
    uint64_t now = app_now();
    if (s_restart_at != 0u && now >= s_restart_at) { platform_restart("cmd_restart_timeout"); }
    if (s_location_deadline != 0u && !s_location_inflight) {
        bool fixed = app_state_get()->gnss.fix_valid;
        if (now >= s_location_deadline) {
            s_location_deadline = 0;
            complete(fixed ? "location_publish_timeout" : "location_unavailable");
        } else if (fixed) {
            s_location_inflight = app_messages_publish_location();
        }
    }
    if (s_ack.status == NULL || now < s_retry_at) { return; }
    if (s_checkpoint_pending) {
        if (storage_command_receipts_save(&s_receipts) != IVTS_OK) {
            s_retry_at = now + ACK_RETRY_MS;
            return;
        }
        s_checkpoint_pending = false;
        if (s_restart_requested) {
            s_restart_requested = false;
            s_restart_at = now + CMD_RESTART_DELAY_MS;
        }
    }
    (void)app_messages_publish_command_ack(s_ack.id, s_ack.status, s_ack.response);
}
