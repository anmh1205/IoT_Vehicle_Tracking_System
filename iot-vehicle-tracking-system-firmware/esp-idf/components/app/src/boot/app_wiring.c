/**
 * @file app_wiring.c
 * @brief Composition of board pins, component task settings and callback ports.
 *
 * This is the only application source that reads the PCB pin map. It connects
 * the modem HTTPS implementation to the OTA byte source and registers publish
 * ACK callbacks.
 */
#include "boot/boot.h"
#include "boot/task_table.h"
#include <string.h>
#include "device/device.h"
#include "publish/publish.h"
#include "command/command.h"
#include "session/motion_alarm.h"
#include "fw/fw_update.h"
#include "app_internal.h"
#include "board/board.h"
#include "board/board_hw.h"
#include "platform/log.h"
#include "ivts_core/base/str.h"
#include "modem/modem.h"
#include "obd/obd.h"
#include "ota/ota.h"
#include "sdkconfig.h"
#include "storage/storage.h"

/*
 * Bind modem HTTPS to the OTA byte-source callbacks so the OTA worker can read
 * through its source interface.
 */
static ivts_err_t src_open(void *ctx, const char *url, uint32_t *size, int *st) { (void)ctx; return modem_http_open(url, size, st); }
static ivts_err_t src_read(void *ctx, uint32_t off, uint8_t *b, size_t n, size_t *got) { (void)ctx; return modem_http_read(off, b, n, got); }
static void src_close(void *ctx) { (void)ctx; modem_http_close(); }

static bool modem_time_get(uint64_t *unix_ms)
{
    bool trusted = false;
    return board_time_get(unix_ms, &trusted) == IVTS_OK && trusted;
}

bool app_wiring_init_board(ivts_sink_t sink)
{
    board_cfg_t board_cfg = {
        .sink = sink, .power_sample_ms = CONFIG_IVTS_POWER_SAMPLE_MS,
        .imu_threshold = CONFIG_IVTS_IMU_THRESHOLD, .imu_enabled = true,
        .task_prio = APP_TASKS[APP_TASK_BOARD].priority, .task_stack = APP_TASKS[APP_TASK_BOARD].stack_bytes,
    };
    ivts_err_t e = board_init(&board_cfg);
    if (e != IVTS_OK) { IVTS_LOGE(APP_TAG, "init step=board result=%s", ivts_err_name(e)); return false; }
    return true;
}

bool app_wiring_init_storage(ivts_sink_t sink)
{
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
        .task_prio = APP_TASKS[APP_TASK_STORAGE].priority, .task_stack = APP_TASKS[APP_TASK_STORAGE].stack_bytes, .req_queue_len = 16,
    };
    ivts_err_t e = storage_init(&storage_cfg);
    if (e != IVTS_OK) { IVTS_LOGE(APP_TAG, "init step=storage result=%s", ivts_err_name(e)); return false; }
    return true;
}

bool app_wiring_init_modem(ivts_sink_t sink, ivts_config_t *config, bool provisioned)
{
    modem_cfg_t modem_cfg = {
        .sink = sink, .time_get = modem_time_get, .uart_num = BOARD_MODEM_UART_NUM, .pin_tx = BOARD_PIN_MODEM_TX,
        .pin_rx = BOARD_PIN_MODEM_RX, .pin_pwrkey = BOARD_PIN_MODEM_PWRKEY,
        .pin_reset = BOARD_PIN_MODEM_RESET, .pwrkey_inverted = BOARD_MODEM_PWRKEY_INVERTED, .baud = BOARD_MODEM_BAUD,
        .mqtt_port = config->mqtt_port,
        .use_tls = config->mqtt_port == 8883u || (provisioned && strcmp(config->mqtt_host, "mqtt.thingdock.dev") == 0), .gnss_period_s = CONFIG_IVTS_GNSS_PERIOD_S,
        .command_subscribe_enabled = config->command_subscribe_enabled,
        .task_prio = APP_TASKS[APP_TASK_MODEM].priority, .task_stack = APP_TASKS[APP_TASK_MODEM].stack_bytes,
    };
    _Static_assert(IVTS_CFG_DEVICE_ID_MAX == MODEM_CLIENT_ID_MAX, "giới hạn client id phải khớp");
    if (provisioned) {
        (void)ivts_str_copy(modem_cfg.apn, sizeof modem_cfg.apn, config->apn);
        (void)ivts_str_copy(modem_cfg.mqtt_host, sizeof modem_cfg.mqtt_host, config->mqtt_host);
        (void)ivts_str_copy(modem_cfg.mqtt_user, sizeof modem_cfg.mqtt_user, config->mqtt_username);
        (void)ivts_str_copy(modem_cfg.mqtt_pass, sizeof modem_cfg.mqtt_pass, config->mqtt_password);
        (void)ivts_str_copy(modem_cfg.device_id, sizeof modem_cfg.device_id, config->device_id);
        (void)ivts_str_copy(modem_cfg.client_id, sizeof modem_cfg.client_id, config->device_id);
    } else {
        /*
         * An unprovisioned device skips modem_set_link() and continues
         * recording to the offline queue.
         */
        (void)ivts_str_copy(modem_cfg.client_id, sizeof modem_cfg.client_id, "unprovisioned");
        config->device_id[sizeof config->device_id - 1u] = '\0';
        config->auth_token[sizeof config->auth_token - 1u] = '\0';
    }
    ivts_err_t e = modem_init(&modem_cfg);
    if (e != IVTS_OK) { IVTS_LOGE(APP_TAG, "init step=modem result=%s", ivts_err_name(e)); return false; }
    app_device_set_provisioned(provisioned);
    if (provisioned) { (void)modem_set_link(true); }
    return true;
}

void app_wiring_init_obd(ivts_sink_t sink, const ivts_config_t *config)
{
    obd_cfg_t obd_cfg = {
        .sink = sink, .poll_ms = CONFIG_IVTS_OBD_POLL_MS, .diag_period_s = 60,
        .task_prio = APP_TASKS[APP_TASK_OBD].priority, .task_stack = APP_TASKS[APP_TASK_OBD].stack_bytes,
    };
    if (memchr(config->obd_ble_addr, '\0', sizeof config->obd_ble_addr) != NULL) {
        (void)ivts_str_copy(obd_cfg.target_addr, sizeof obd_cfg.target_addr, config->obd_ble_addr);
    }
    if (obd_init(&obd_cfg) != IVTS_OK) { IVTS_LOGW(APP_TAG, "init step=obd result=fail action=run_without_obd"); }
}

bool app_wiring_init_ota(ivts_sink_t sink)
{
    ota_cfg_t ota_cfg = {
        .sink = sink, .src = { .open = src_open, .read = src_read, .close = src_close, .ctx = NULL },
        .prepare_boot = app_fw_update_prepare_boot,
        .task_prio = APP_TASKS[APP_TASK_OTA].priority, .task_stack = APP_TASKS[APP_TASK_OTA].stack_bytes,
    };
    if (ota_init(&ota_cfg) != IVTS_OK) { return false; }
    return true;
}

void app_wiring_register_acks(void)
{
    static const app_msg_ack_fn handlers[APP_MSG_COUNT] = {
        [APP_MSG_RAW_LIVE] = app_messages_on_live_ack,
        [APP_MSG_RAW_REPLAY] = app_replay_on_ack,
        [APP_MSG_LOCATION] = app_cmd_on_location_ack,
        [APP_MSG_STATUS] = app_outbox_on_status_ack,
        [APP_MSG_BOUNDARY] = app_outbox_on_boundary_ack,
        [APP_MSG_EVENT] = app_outbox_on_event_ack,
        [APP_MSG_ALARM] = app_alarm_on_ack,
        [APP_MSG_FW] = app_fw_update_on_report_acked,
        [APP_MSG_CMD_ACK] = app_cmd_on_ack,
    };
    app_publisher_set_ack_handlers(handlers);
}
