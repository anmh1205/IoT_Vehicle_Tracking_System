/**
 * @file app_init.c
 * @brief Composition root: khởi tạo component theo thứ tự, nối sink và cổng, nạp cấu hình.
 *
 * ## Bảng task
 *
 * Priority lớn hơn thì được lập lịch trước khi nhiều task cùng sẵn sàng.
 *
 *     task     prio  stack  sở hữu
 *     modem     6    6144   UART1, SIM7600, ô publish và command
 *     app       5    6144   queue sự kiện, FSM, snapshot telemetry (app_os.c)
 *     obd       4    4096   phiên ELM327 (NimBLE host task do stack BLE tự tạo)
 *     storage   3    5120   SD/FATFS, offline queue, NVS
 *     ota       3    6144   chỉ tồn tại khi đang tải
 *     board     2    3072   ngắt IMU, lấy mẫu ADC
 *
 * - "modem" cao nhất vì byte UART phải được rút kịp: ở 115200 baud, RX buffer 4 KB đầy sau
 *   khoảng 0,36 s nếu task không chạy.
 * - "board" thấp nhất vì mẫu ADC trễ vài trăm ms không ảnh hưởng chức năng.
 * - Stack là giá trị khởi điểm; kiểm chứng bằng uxTaskGetStackHighWaterMark() qua app_diag_tick()
 *   khi bật CONFIG_IVTS_DIAG_STACK_LOG.
 *
 * Mọi task nhận cùng một sink (app_sink()) nên mọi sự kiện hội tụ về queue của task "app".
 */

#include "app_priv.h"
#include "app_timing.h"
#include <string.h>
#include "board/board.h"
#include "board/board_hw.h"
#include "esp_log.h"
#include "esp_random.h"
#include "esp_system.h"
#include "ivts_core/base/str.h"
#include "modem/modem.h"
#include "obd/obd.h"
#include "ota/ota.h"
#include "sdkconfig.h"
#include "storage/storage.h"

/* Priority của các task do app_init_all() cấu hình; "app" (5) cố định trong app_os.c. */
enum {
    PRIO_MODEM = 6, PRIO_OBD = 4, PRIO_STORAGE = 3, PRIO_OTA = 3, PRIO_BOARD = 2,
};

/* Cổng nguồn byte cho OTA: chuyển modem_http_* thành ota_source_t, để component ota không
 * phụ thuộc trực tiếp vào modem. */
static ivts_err_t src_open(void *ctx, const char *url, uint32_t *size, int *st) { (void)ctx; return modem_http_open(url, size, st); }
static ivts_err_t src_read(void *ctx, uint32_t off, uint8_t *b, size_t n, size_t *got) { (void)ctx; return modem_http_read(off, b, n, got); }
static void src_close(void *ctx) { (void)ctx; modem_http_close(); }

static bool modem_time_get(uint64_t *unix_ms)
{
    bool trusted = false;
    return board_time_get(unix_ms, &trusted) == IVTS_OK && trusted;
}

static ivts_err_t prepare_ota_boot(const ivts_ota_cmd_t *cmd, const char *partition)
{
    ivts_ota_pending_t pending = { .pending = true, .timeout_s = cmd->confirm_timeout_s };
    bool trusted;
    uint64_t now = app_clock_unix_ms_or_zero(&trusted);
    if (trusted) { pending.deadline_unix_ms = now + (uint64_t)pending.timeout_s * 1000u; }
    (void)ivts_str_copy(pending.job_id, sizeof pending.job_id, cmd->job_id);
    (void)ivts_str_copy(pending.target_version, sizeof pending.target_version, cmd->version);
    (void)ivts_str_copy(pending.target_partition, sizeof pending.target_partition, partition);
    return storage_ota_pending_save(&pending);
}

/* Xem app_priv.h. */
void app_apply_config(void)
{
    const ivts_config_t *c = &g_app.cfg;
    bool real_sleep = c->sleep_enabled;
#if CONFIG_IVTS_FORCE_FAKE_SLEEP
    real_sleep = false;
#endif
    g_app.axes_cfg = (ivts_axes_cfg_t){
        .on_threshold_mv = c->ignition_adc_threshold_mv,
        .hysteresis_mv = CONFIG_IVTS_IGNITION_HYST_MV,
        .on_hold_ms = CONFIG_IVTS_IGNITION_ON_HOLD_MS,
        .off_hold_ms = c->ignition_off_hold_ms,
        .motion_quiet_ms = MOTION_QUIET_MS,
    };
    g_app.fsm_cfg = (ivts_fsm_cfg_t){
        .tracking_ms = (uint32_t)c->tracking_interval_s * 1000u,
        .alarm_ms = (uint32_t)c->alarm_interval_s * 1000u,
        .alarm_timeout_ms = (uint32_t)c->alarm_timeout_s * 1000u,
        .heartbeat_s = c->heartbeat_interval_s,
        .status_ms = STATUS_PERIOD_MS,
        .check_ign_max_ms = CHECK_IGN_MAX_MS,
        .parked_settle_ms = PARKED_SETTLE_MS,
        .awake_max_ms = AWAKE_MAX_MS,
        .sleep_enabled = real_sleep,
        .imu_wakeup_enabled = c->imu_wakeup_enabled && board_imu_ok(),
        .deep_wake_on_motion = board_motion_deep_wake_capable(),
    };
}

/**
 * @brief Điền thông tin triển khai từ Kconfig vào các trường cấu hình còn trống.
 *
 * Giá trị đã có trong NVS được giữ nguyên; Kconfig chỉ là giá trị mặc định.
 */
static bool fill_deploy_defaults(ivts_config_t *c)
{
    const struct { char *dst; size_t size; const char *value; } fields[] = {
        { c->device_id, sizeof c->device_id, CONFIG_IVTS_DEFAULT_DEVICE_ID },
        { c->auth_token, sizeof c->auth_token, CONFIG_IVTS_DEFAULT_AUTH_TOKEN },
        { c->mqtt_host, sizeof c->mqtt_host, CONFIG_IVTS_MQTT_HOST },
        { c->apn, sizeof c->apn, CONFIG_IVTS_APN },
        { c->mqtt_username, sizeof c->mqtt_username, CONFIG_IVTS_MQTT_USER },
        { c->mqtt_password, sizeof c->mqtt_password, CONFIG_IVTS_MQTT_PASS },
    };
    bool ok = true;
    for (size_t i = 0; i < sizeof fields / sizeof fields[0]; i++) {
        if (fields[i].dst[0] == '\0' && ivts_str_copy(fields[i].dst, fields[i].size, fields[i].value) != IVTS_OK) {
            fields[i].dst[0] = '\0';
            ok = false;
        }
    }
    if (c->mqtt_port == 0u) { c->mqtt_port = (uint16_t)CONFIG_IVTS_MQTT_PORT; }
    return ok;
}

static void restore_pending_verify(const ivts_ota_pending_t *saved)
{
    g_app.ota_pending = *saved;
    g_app.ota_pending.pending = true;
    if (g_app.ota_pending.timeout_s == 0u) { g_app.ota_pending.timeout_s = IVTS_OTA_CONFIRM_DEFAULT_S; }
    g_app.ota_confirm_pending = true;
    g_app.fw.status = IVTS_OTA_ST_CONFIRMING;
    g_app.fw.progress = IVTS_OTA_PCT_CONFIRMING;
    (void)ivts_str_copy(g_app.fw.job_id, sizeof g_app.fw.job_id, saved->job_id);
    (void)ivts_str_copy(g_app.fw.target_version, sizeof g_app.fw.target_version, saved->target_version);
    ESP_LOGW(APP_TAG, "image PENDING_VERIFY, hạn %lus", (unsigned long)g_app.ota_pending.timeout_s);
}

static bool image_landed(const ivts_ota_pending_t *saved, const char *version, const char *partition)
{
    return saved->target_version[0] != '\0' && strcmp(saved->target_version, version) == 0 &&
                  (saved->target_partition[0] == '\0' || strcmp(saved->target_partition, partition) == 0);
}

static void restore_after_reboot(const ivts_ota_pending_t *saved)
{
    bool landed = image_landed(saved, ota_running_version(), ota_running_partition());
    g_app.fw.status = landed ? IVTS_OTA_ST_SUCCESS : IVTS_OTA_ST_ROLLED_BACK;
    g_app.fw.progress = landed ? IVTS_OTA_PCT_DONE : 0u;
    g_app.fw.error = landed ? IVTS_OTA_E_NONE : IVTS_OTA_E_CONFIRM_TIMEOUT;
    (void)ivts_str_copy(g_app.fw.job_id, sizeof g_app.fw.job_id, saved->job_id);
    (void)ivts_str_copy(g_app.fw.target_version, sizeof g_app.fw.target_version, saved->target_version);
    g_app.ota_report_pending = true;
    ESP_LOGW(APP_TAG, "OTA %s: %s", saved->target_version, landed ? "đã xác nhận" : "đã bị rollback");
}

static void restore_idle(void)
{
    g_app.fw.status = IVTS_OTA_ST_SUCCESS;
    g_app.fw.progress = IVTS_OTA_PCT_DONE;
}

static void restore_at_boot(void)
{
    ivts_ota_pending_t saved;
    (void)storage_ota_pending_load(&saved);
    (void)ivts_str_copy(g_app.fw.current_version, sizeof g_app.fw.current_version, ota_running_version());
    (void)ivts_str_copy(g_app.fw.partition, sizeof g_app.fw.partition, ota_running_partition());
    g_app.fw_dirty = true;
    if (ota_image_pending_verify()) {
        restore_pending_verify(&saved);
    } else if (saved.pending) {
        restore_after_reboot(&saved);
    } else {
        restore_idle();
    }
}

/**
 * @brief Khởi tạo mọi component theo thứ tự: queue, board, storage, modem, obd, ota.
 *
 * - Queue được tạo đầu tiên vì mọi bước sau đều có thể phát sự kiện ngay (config hỏng, SD
 *   mount lỗi).
 * - storage khởi tạo trước obd vì nimble_port_init() dùng NVS.
 * - Lỗi bắt buộc (trả false): queue, board (thiếu ADC thì không đo được ignition), NVS, modem.
 * - Lỗi suy giảm (chạy tiếp): SD, IMU, RTC, OBD.
 *
 * Thiết bị chưa provision (cấu hình không hợp lệ) vẫn chạy và ghi offline queue, nhưng
 * không kết nối MQTT.
 *
 * @return true nếu đã sẵn sàng tạo task "app".
 */
bool app_init_all(void)
{
    if (!app_os_init()) { ESP_LOGE(APP_TAG, "queue"); return false; }
    ivts_sink_t sink = app_sink();

    board_cfg_t board_cfg = {
        .sink = sink, .power_sample_ms = CONFIG_IVTS_POWER_SAMPLE_MS,
        .imu_threshold = CONFIG_IVTS_IMU_THRESHOLD, .imu_enabled = true,
        .task_prio = PRIO_BOARD, .task_stack = 3072,
    };
    ivts_err_t e = board_init(&board_cfg);
    if (e != IVTS_OK) { ESP_LOGE(APP_TAG, "board: %s", ivts_err_name(e)); return false; }

    storage_cfg_t storage_cfg = {
        .sink = sink,
#if CONFIG_IVTS_SD_ENABLE
        .sd_enabled = true,
        .log_file_max_bytes = CONFIG_IVTS_SD_LOG_FILE_MAX,
        .log_quota_bytes = CONFIG_IVTS_SD_LOG_QUOTA,
        .queue_segment_bytes = CONFIG_IVTS_QUEUE_SEGMENT_BYTES,
        .queue_max_segments = CONFIG_IVTS_QUEUE_MAX_SEGMENTS,
#endif
        .pin_clk = BOARD_PIN_SD_CLK, .pin_cmd = BOARD_PIN_SD_CMD, .pin_d0 = BOARD_PIN_SD_D0,
        .pin_d1 = BOARD_PIN_SD_D1, .pin_d2 = BOARD_PIN_SD_D2, .pin_d3 = BOARD_PIN_SD_D3,
        .pin_cd = BOARD_PIN_SD_CD,
        .task_prio = PRIO_STORAGE, .task_stack = 5120, .req_queue_len = 16,
    };
    e = storage_init(&storage_cfg);
    if (e != IVTS_OK) { ESP_LOGE(APP_TAG, "storage: %s", ivts_err_name(e)); return false; }

    app_cmd_init();
    (void)storage_config_load(&g_app.cfg);
    (void)storage_tracking_load(&g_app.tracking_enabled);
    e = storage_session_load(&g_app.session);
    if (e != IVTS_OK && e != IVTS_ERR_NOT_FOUND) {
        ESP_LOGW(APP_TAG, "session NVS: %s", ivts_err_name(e));
    }
    g_app.alarm_persisted = storage_alarm_load(&g_app.alarm) == IVTS_OK && g_app.alarm.seq != 0u;
    bool defaults_ok = fill_deploy_defaults(&g_app.cfg);
    ivts_cfg_issue_t config_issues[IVTS_CFG_F_COUNT];
    size_t config_issue_count = ivts_config_validate(&g_app.cfg, config_issues, IVTS_CFG_F_COUNT);
    for (size_t i = 0; i < config_issue_count && i < IVTS_CFG_F_COUNT; i++) {
        ESP_LOGW(APP_TAG, "config field %u reason %u", config_issues[i].field, config_issues[i].reason);
    }
    /* Chỉ app_sleep_enter() cho CPU ngủ sau khi modem và BLE đã dừng. */
    e = board_set_auto_light_sleep(false);
    if (e != IVTS_OK) { ESP_LOGW(APP_TAG, "power management: %s", ivts_err_name(e)); }
    app_apply_config();

    /* boot_id: thức từ deep sleep thì giữ nguyên (ngữ cảnh RTC còn hợp lệ); boot nguội thì
     * lấy số mới từ NVS. */
    uint32_t seq = 0;
    if (esp_reset_reason() != ESP_RST_DEEPSLEEP || !app_rtc_ctx_load(&g_app.boot_id, &seq)) {
        if (storage_boot_id_next(&g_app.boot_id) != IVTS_OK) { g_app.boot_id = esp_random(); }
        app_rtc_ctx_save(g_app.boot_id, 0, 0);
    }

    bool provisioned = defaults_ok && config_issue_count == 0u;
    modem_cfg_t modem_cfg = {
        .sink = sink, .time_get = modem_time_get, .uart_num = BOARD_MODEM_UART_NUM, .pin_tx = BOARD_PIN_MODEM_TX,
        .pin_rx = BOARD_PIN_MODEM_RX, .pin_pwrkey = BOARD_PIN_MODEM_PWRKEY,
        .pin_reset = BOARD_PIN_MODEM_RESET, .pwrkey_inverted = BOARD_MODEM_PWRKEY_INVERTED, .baud = BOARD_MODEM_BAUD,
        .mqtt_port = g_app.cfg.mqtt_port, .gnss_period_s = CONFIG_IVTS_GNSS_PERIOD_S,
        .command_subscribe_enabled = g_app.cfg.command_subscribe_enabled,
        .task_prio = PRIO_MODEM, .task_stack = 6144,
    };
    _Static_assert(IVTS_CFG_DEVICE_ID_MAX == MODEM_CLIENT_ID_MAX, "giới hạn client id phải khớp");
    if (provisioned) {
        (void)ivts_str_copy(modem_cfg.apn, sizeof modem_cfg.apn, g_app.cfg.apn);
        (void)ivts_str_copy(modem_cfg.mqtt_host, sizeof modem_cfg.mqtt_host, g_app.cfg.mqtt_host);
        (void)ivts_str_copy(modem_cfg.mqtt_user, sizeof modem_cfg.mqtt_user, g_app.cfg.mqtt_username);
        (void)ivts_str_copy(modem_cfg.mqtt_pass, sizeof modem_cfg.mqtt_pass, g_app.cfg.mqtt_password);
        (void)ivts_str_copy(modem_cfg.device_id, sizeof modem_cfg.device_id, g_app.cfg.device_id);
        (void)ivts_str_copy(modem_cfg.client_id, sizeof modem_cfg.client_id, g_app.cfg.device_id);
    } else {
        /* Chưa provision thì không kết nối cloud (modem_set_link không được gọi), nhưng dữ liệu
         * vẫn được ghi vào offline queue. */
        (void)ivts_str_copy(modem_cfg.client_id, sizeof modem_cfg.client_id, "unprovisioned");
        g_app.cfg.device_id[sizeof g_app.cfg.device_id - 1u] = '\0';
        g_app.cfg.auth_token[sizeof g_app.cfg.auth_token - 1u] = '\0';
    }
    e = modem_init(&modem_cfg);
    if (e != IVTS_OK) { ESP_LOGE(APP_TAG, "modem: %s", ivts_err_name(e)); return false; }
    g_app.provisioned = provisioned;
    if (provisioned) { (void)modem_set_link(true); }

    obd_cfg_t obd_cfg = {
        .sink = sink, .poll_ms = CONFIG_IVTS_OBD_POLL_MS, .diag_period_s = 60,
        .task_prio = PRIO_OBD, .task_stack = 4096,
    };
    if (memchr(g_app.cfg.obd_ble_addr, '\0', sizeof g_app.cfg.obd_ble_addr) != NULL) {
        (void)ivts_str_copy(obd_cfg.target_addr, sizeof obd_cfg.target_addr, g_app.cfg.obd_ble_addr);
    }
    if (obd_init(&obd_cfg) != IVTS_OK) { ESP_LOGW(APP_TAG, "obd init lỗi: chạy không OBD"); }

    ota_cfg_t ota_cfg = {
        .sink = sink, .src = { .open = src_open, .read = src_read, .close = src_close, .ctx = NULL },
        .prepare_boot = prepare_ota_boot,
        .task_prio = PRIO_OTA, .task_stack = 6144,
    };
    if (ota_init(&ota_cfg) != IVTS_OK) { return false; }

    restore_at_boot();
    ESP_LOGI(APP_TAG, "init xong boot_id=%lu provisioned=%d sd=%d", (unsigned long)g_app.boot_id,
             provisioned, storage_sd_ok());
    return true;
}
