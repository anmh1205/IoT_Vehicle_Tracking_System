#include "ivts_core/model/config.h"
#include <string.h>

typedef struct {
    ivts_cfg_issue_t *out;
    size_t cap;
    size_t n;
} issue_sink_t;

static void add_issue(issue_sink_t *s, ivts_cfg_field_t f, ivts_cfg_reason_t r)
{
    if (s->n < s->cap) {
        s->out[s->n].field  = (uint8_t)f;
        s->out[s->n].reason = (uint8_t)r;
    }
    s->n++;
}

static void check_range(issue_sink_t *s, ivts_cfg_field_t f,
                        uint32_t v, uint32_t lo, uint32_t hi)
{
    if (v < lo) {
        add_issue(s, f, IVTS_CFG_R_TOO_LOW);
    } else if (v > hi) {
        add_issue(s, f, IVTS_CFG_R_TOO_HIGH);
    }
}

/* Chuỗi bắt buộc: phải có NUL trong buffer và không rỗng. */
static void check_required_str(issue_sink_t *s, ivts_cfg_field_t f,
                               const char *buf, size_t size)
{
    if (memchr(buf, '\0', size) == NULL) {
        add_issue(s, f, IVTS_CFG_R_BAD_FORMAT);
    } else if (buf[0] == '\0') {
        add_issue(s, f, IVTS_CFG_R_EMPTY);
    }
}

/* Chuỗi tuỳ chọn: rỗng được, nhưng nếu có thì phải có NUL. */
static void check_optional_str(issue_sink_t *s, ivts_cfg_field_t f,
                               const char *buf, size_t size)
{
    if (memchr(buf, '\0', size) == NULL) {
        add_issue(s, f, IVTS_CFG_R_BAD_FORMAT);
    }
}

static void check_at_str(issue_sink_t *s, ivts_cfg_field_t f, const char *buf, size_t cap, bool topic)
{
    for (size_t i = 0; i < cap && buf[i] != '\0'; i++) {
        unsigned char c = (unsigned char)buf[i];
        if (c < 0x20u || c == 0x7fu || c == '"' || c == '\\' ||
            (topic && (c == '#' || c == '+' || c == '/'))) {
            add_issue(s, f, IVTS_CFG_R_BAD_FORMAT);
            return;
        }
    }
}

static bool is_hex(char ch)
{
    return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
}

/* "AA:BB:CC:DD:EE:FF" — đúng 17 ký tự, ':' ở vị trí 2,5,8,11,14. */
static bool ble_addr_ok(const char *a)
{
    if (strlen(a) != 17u) {
        return false;
    }
    for (size_t i = 0; i < 17u; i++) {
        if ((i % 3u) == 2u) {
            if (a[i] != ':') { return false; }
        } else if (!is_hex(a[i])) {
            return false;
        }
    }
    return true;
}

void ivts_config_defaults(ivts_config_t *c)
{
    if (c == NULL) {
        return;
    }
    memset(c, 0, sizeof(*c));   /* Xoá cả padding: blob được CRC khi lưu NVS. */

    c->heartbeat_interval_s      = (uint16_t)IVTS_CFG_DEFAULT_HEARTBEAT_S;
    c->tracking_interval_s       = (uint16_t)IVTS_CFG_DEFAULT_TRACKING_S;
    c->alarm_interval_s          = (uint16_t)IVTS_CFG_DEFAULT_ALARM_INTERVAL_S;
    c->ignition_off_hold_ms      = (uint16_t)IVTS_CFG_DEFAULT_IGN_OFF_HOLD_MS;
    c->alarm_timeout_s           = (uint16_t)IVTS_CFG_DEFAULT_ALARM_TIMEOUT_S;
    c->ota_min_battery_mv        = (uint16_t)IVTS_CFG_DEFAULT_OTA_MIN_BATT_MV;
    c->ignition_adc_threshold_mv = (uint16_t)IVTS_CFG_DEFAULT_IGN_ADC_MV;
    c->sleep_enabled             = true;
    c->imu_wakeup_enabled        = true;
    c->command_subscribe_enabled = true;
    /* mqtt_port = 0 và các chuỗi để trống: app_boot.c điền từ Kconfig. */
}

size_t ivts_config_validate(const ivts_config_t *c, ivts_cfg_issue_t *out, size_t cap)
{
    if (c == NULL) {
        return 1u;
    }
    issue_sink_t s = { out, (out == NULL) ? 0u : cap, 0u };

    check_required_str(&s, IVTS_CFG_F_DEVICE_ID,  c->device_id,  IVTS_CFG_DEVICE_ID_MAX + 1u);
    check_required_str(&s, IVTS_CFG_F_AUTH_TOKEN, c->auth_token, sizeof(c->auth_token));
    check_required_str(&s, IVTS_CFG_F_MQTT_HOST,  c->mqtt_host,  sizeof(c->mqtt_host));
    check_required_str(&s, IVTS_CFG_F_APN,        c->apn,        sizeof(c->apn));
    check_optional_str(&s, IVTS_CFG_F_MQTT_USERNAME, c->mqtt_username, sizeof(c->mqtt_username));
    check_optional_str(&s, IVTS_CFG_F_MQTT_PASSWORD, c->mqtt_password, sizeof(c->mqtt_password));
    check_at_str(&s, IVTS_CFG_F_DEVICE_ID, c->device_id, sizeof(c->device_id), true);
    check_at_str(&s, IVTS_CFG_F_MQTT_HOST, c->mqtt_host, sizeof(c->mqtt_host), false);
    check_at_str(&s, IVTS_CFG_F_APN, c->apn, sizeof(c->apn), false);
    check_at_str(&s, IVTS_CFG_F_MQTT_USERNAME, c->mqtt_username, sizeof(c->mqtt_username), false);
    check_at_str(&s, IVTS_CFG_F_MQTT_PASSWORD, c->mqtt_password, sizeof(c->mqtt_password), false);

    if (memchr(c->obd_ble_addr, '\0', sizeof(c->obd_ble_addr)) == NULL) {
        add_issue(&s, IVTS_CFG_F_OBD_BLE_ADDR, IVTS_CFG_R_BAD_FORMAT);
    } else if (c->obd_ble_addr[0] != '\0' && !ble_addr_ok(c->obd_ble_addr)) {
        add_issue(&s, IVTS_CFG_F_OBD_BLE_ADDR, IVTS_CFG_R_BAD_FORMAT);
    }

    check_range(&s, IVTS_CFG_F_MQTT_PORT,      c->mqtt_port,
                IVTS_CFG_MQTT_PORT_MIN, IVTS_CFG_MQTT_PORT_MAX);
    check_range(&s, IVTS_CFG_F_HEARTBEAT,      c->heartbeat_interval_s,
                IVTS_CFG_HEARTBEAT_S_MIN, IVTS_CFG_HEARTBEAT_S_MAX);
    check_range(&s, IVTS_CFG_F_TRACKING,       c->tracking_interval_s,
                IVTS_CFG_TRACKING_S_MIN, IVTS_CFG_TRACKING_S_MAX);
    check_range(&s, IVTS_CFG_F_ALARM_INTERVAL, c->alarm_interval_s,
                IVTS_CFG_ALARM_INTERVAL_S_MIN, IVTS_CFG_ALARM_INTERVAL_S_MAX);
    check_range(&s, IVTS_CFG_F_IGN_OFF_HOLD,   c->ignition_off_hold_ms,
                IVTS_CFG_IGN_OFF_HOLD_MS_MIN, IVTS_CFG_IGN_OFF_HOLD_MS_MAX);
    check_range(&s, IVTS_CFG_F_ALARM_TIMEOUT,  c->alarm_timeout_s,
                IVTS_CFG_ALARM_TIMEOUT_S_MIN, IVTS_CFG_ALARM_TIMEOUT_S_MAX);
    check_range(&s, IVTS_CFG_F_OTA_MIN_BATT,   c->ota_min_battery_mv,
                IVTS_CFG_OTA_MIN_BATT_MV_MIN, IVTS_CFG_OTA_MIN_BATT_MV_MAX);
    check_range(&s, IVTS_CFG_F_IGN_ADC,        c->ignition_adc_threshold_mv,
                IVTS_CFG_IGN_ADC_MV_MIN, IVTS_CFG_IGN_ADC_MV_MAX);

    return s.n;
}
