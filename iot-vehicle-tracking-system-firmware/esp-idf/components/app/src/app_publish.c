/**
 * @file app_publish.c
 * @brief Dựng payload, gửi qua ô publish của modem, xử lý ACK và replay offline queue.
 *
 * ## Luồng dữ liệu
 *
 * - Bản ghi RAW không gửi được (không có broker, ô publish bận, hoặc ACK báo lỗi) được đẩy vào
 *   offline queue trên SD, giữ nguyên boot_id và seq đã cấp.
 * - Khi có mạng, replay lấy từng bản ghi từ queue, gửi lại với boot_id và seq gốc; bản ghi
 *   chỉ bị xoá khỏi queue sau khi ACK thành công (at-least-once). Cloud khử trùng lặp theo
 *   (boot_id, seq).
 * - Status không xếp hàng khi gửi lỗi vì status cũ không còn giá trị. Event và firmware status
 *   được gửi lại nhờ cờ event_dirty và fw_dirty.
 *
 * ## Mô hình thực thi
 *
 * Mọi hàm trong file chạy trong task "app". s_buf là bộ đệm payload dùng chung; modem_publish()
 * sao chép dữ liệu vào ô của modem trước khi trả về nên s_buf được dùng lại ngay. Tại một thời
 * điểm chỉ có một bản tin bay (g_app.pub_inflight); ACK quay về qua queue dưới dạng
 * IVTS_EV_MQTT_ACK và được đối chiếu bằng pub_tx.
 *
 * Việc xoá bản ghi khỏi queue là bất đồng bộ: storage_queue_pop() chỉ gửi yêu cầu cho task
 * "storage". popped_token ghi nhớ token vừa pop để replay không gửi lại bản ghi còn nằm trong
 * ô peek chưa kịp dọn.
 *
 * ## Khi reset hoặc mất nguồn
 *
 * - Reset khi bản tin đang bay: bản ghi RAW live đang bay (pub_rec) chỉ nằm trong RAM nên mất;
 *   bản ghi replay vẫn còn trong queue và được gửi lại.
 * - Reset sau ACK nhưng trước khi storage xử lý pop: bản ghi được gửi lại một lần nữa và cloud
 *   khử trùng lặp theo (boot_id, seq).
 */

#include "app_priv.h"
#include "app_timing.h"
#include <string.h>
#include "esp_log.h"
#include "ivts_core/payload/json_writer.h"
#include "ivts_core/payload/payload.h"
#include "modem/modem.h"
#include "storage/storage.h"

_Static_assert(IVTS_PAYLOAD_MAX - 1u <= MODEM_PAYLOAD_MAX, "payload phải vừa trong ô publish");

static char s_buf[IVTS_PAYLOAD_MAX];   /* Bộ đệm payload dùng chung; chỉ task "app" truy cập. */
static uint32_t s_tx_seq;              /* Mã giao dịch publish; ACK được đối chiếu bằng mã này. */
static uint64_t s_peek_asked_at;       /* Thời điểm (ms) đã yêu cầu storage nạp ô peek lần gần nhất. */
static uint64_t s_boundary_retry_at;
static uint64_t s_alarm_retry_at;
static bool replay_before(const ivts_session_boundary_t *boundary);

/** Tạo metadata chung của bản tin. Giờ RTC không đáng tin thì sent_unix_ms = 0. */
static ivts_msg_meta_t meta(uint32_t seq)
{
    ivts_msg_meta_t m = {
        .device_id = g_app.cfg.device_id,
        .auth_token = g_app.cfg.auth_token[0] != '\0' ? g_app.cfg.auth_token : NULL,
        .boot_id = g_app.boot_id,
        .seq = seq,
        .uptime_ms = app_now(),
    };
    m.sent_unix_ms = app_clock_unix_ms_or_zero(&m.time_trusted);
    return m;
}

/** Đẩy bản ghi vào offline queue. Lỗi encode hoặc queue đầy được ghi log; bản ghi bị mất. */
static void to_queue(const ivts_record_t *r)
{
    uint8_t b[IVTS_RECORD_MAX_SIZE];
    size_t n = 0;
    if (ivts_record_encode(r, b, sizeof b, &n) != IVTS_OK) { return; }
    ivts_err_t e = storage_queue_push(b, n);
    if (e != IVTS_OK) {
        ESP_LOGW(APP_TAG, "mất bản ghi seq=%lu (%s)", (unsigned long)r->seq, ivts_err_name(e));
    }
}

/**
 * @brief Gửi s_buf[0..len) lên @p topic nếu broker đang kết nối và không có bản tin nào đang bay.
 * @return true nếu modem đã nhận bản tin (đang chờ ACK); false nếu không gửi được.
 */
static bool send(pub_kind_t kind, modem_topic_t topic, size_t len)
{
    uint32_t tx = ++s_tx_seq;
    if (g_app.link != IVTS_LINK_BROKER_UP || g_app.pub_inflight ||
        modem_publish(topic, s_buf, len, tx) != IVTS_OK) {
        return false;
    }
    g_app.pub_inflight = true;
    g_app.pub_kind = kind;
    g_app.pub_tx = tx;
    return true;
}

/**
 * @brief Dựng và gửi một bản tin theo loại. Xem mô tả ở đầu file về xử lý khi gửi lỗi.
 */
void app_publish(pub_kind_t kind)
{
    size_t len = 0;
    ivts_err_t e = IVTS_ERR_INVALID_ARG;
    switch (kind) {
    case PUB_RAW_LIVE: {
        ivts_record_t r;
        app_state_make_record(&r);
        ivts_msg_meta_t m = { .device_id = g_app.cfg.device_id, .auth_token = g_app.cfg.auth_token };
        e = ivts_payload_rawdata(&m, &r, app_state_get(), s_buf, sizeof s_buf, &len);
        if (g_app.session.count == 0u && storage_queue_pending() == 0u && !storage_queue_push_pending() &&
            e == IVTS_OK && send(kind, MODEM_TOPIC_RAWDATA, len)) {
            g_app.pub_rec = r;
        } else {
            to_queue(&r);                     /* Bản ghi giữ boot_id và seq đã cấp khi replay. */
        }
        return;
    }
    case PUB_STATUS: {
        ivts_msg_meta_t m = meta(app_rtc_next_seq());
        bool heartbeat = g_app.fsm.state == IVTS_ST_HEARTBEAT || !g_app.tracking_enabled;
        e = ivts_payload_status(&m, app_state_get(), &g_app.session.active, IVTS_BOUNDARY_NONE,
                                heartbeat, s_buf, sizeof s_buf, &len);
        if (e == IVTS_OK && send(kind, MODEM_TOPIC_STATUS, len)) { g_app.status_dirty = false; }
        return;
    }
    case PUB_BOUNDARY: {
        const ivts_session_boundary_t *b = &g_app.session.outbox[0];
        ivts_msg_meta_t m = {
            .device_id = g_app.cfg.device_id, .auth_token = g_app.cfg.auth_token,
            .boot_id = b->boot_id, .seq = b->seq, .sent_unix_ms = b->unix_ms,
            .time_trusted = b->unix_ms != 0u, .uptime_ms = b->uptime_ms,
        };
        bool started = b->kind == IVTS_BOUNDARY_STARTED;
        ivts_telemetry_t t = {
            .ignition = started ? IVTS_IGN_ON : IVTS_IGN_OFF,
            .vehicle = started ? IVTS_VEH_UNKNOWN : IVTS_VEH_PARKED_OFF,
            .device_state = IVTS_DEV_ACTIVE,
        };
        e = ivts_payload_status(&m, &t, &b->session, (ivts_boundary_kind_t)b->kind,
                                false, s_buf, sizeof s_buf, &len);
        s_boundary_retry_at = app_now() + BOUNDARY_RETRY_MS;
        if (e == IVTS_OK) { (void)send(kind, MODEM_TOPIC_STATUS, len); }
        return;
    }
    case PUB_EVENT: {
        ivts_msg_meta_t m = meta(app_rtc_next_seq());
        e = ivts_payload_event(&m, 0, "warning", g_app.event_code, s_buf, sizeof s_buf, &len);
        if (e == IVTS_OK && send(kind, MODEM_TOPIC_EVENTS, len)) { g_app.event_dirty = false; }
        return;
    }
    case PUB_ALARM: {
        const ivts_motion_alarm_t *a = &g_app.alarm;
        ivts_msg_meta_t m = {
            .device_id = g_app.cfg.device_id, .auth_token = g_app.cfg.auth_token,
            .boot_id = a->boot_id, .seq = a->seq, .sent_unix_ms = a->unix_ms,
            .time_trusted = a->unix_ms != 0u, .uptime_ms = a->uptime_ms,
        };
        e = ivts_payload_event(&m, 1001, "warning", "motion_detected", s_buf, sizeof s_buf, &len);
        if (e == IVTS_OK) { (void)send(kind, MODEM_TOPIC_EVENTS, len); }
        return;
    }
    case PUB_FW: {
        ivts_msg_meta_t m = meta(app_rtc_next_seq());
        e = ivts_payload_firmware(&m, &g_app.fw, s_buf, sizeof s_buf, &len);
        if (e == IVTS_OK && send(kind, MODEM_TOPIC_FIRMWARE, len)) { g_app.fw_dirty = false; }
        return;
    }
    default:
        return;
    }
}

/**
 * @brief Gửi phản hồi cho một command.
 * @param status "accepted", "acknowledged" hoặc "failed".
 */
bool app_publish_ack_cmd(const char *command_id, const char *status, const char *response)
{
    char boot[IVTS_BOOT_ID_SIZE];
    ivts_boot_id_format(boot, g_app.boot_id);
    ivts_jw_t w;
    ivts_jw_init(&w, s_buf, sizeof s_buf);
    ivts_jw_obj_begin(&w, NULL);
    ivts_jw_str(&w, "command_id", command_id);
    ivts_jw_str(&w, "status", status);
    ivts_jw_str(&w, "boot_id", boot);
    if (response != NULL) { ivts_jw_str(&w, "response", response); }
    ivts_jw_obj_end(&w);
    size_t len = 0;
    return ivts_jw_finish(&w, &len) == IVTS_OK && send(PUB_CMD_ACK, MODEM_TOPIC_CMD_ACK, len);
}

/** Gửi mẫu vị trí hiện tại sau mốc phiên, kể cả khi SD đang có mẫu lịch sử. */
bool app_publish_location(void)
{
    const ivts_telemetry_t *telemetry = app_state_get();
    if (!telemetry->gnss.fix_valid || g_app.session.count != 0u || g_app.pub_inflight ||
        g_app.link != IVTS_LINK_BROKER_UP) { return false; }

    ivts_record_t record;
    app_state_make_record(&record);
    if (!record.gnss.fix_valid) { return false; }
    ivts_msg_meta_t m = { .device_id = g_app.cfg.device_id, .auth_token = g_app.cfg.auth_token };
    size_t len;
    return ivts_payload_rawdata(&m, &record, telemetry, s_buf, sizeof s_buf, &len) == IVTS_OK &&
           send(PUB_LOCATION, MODEM_TOPIC_RAWDATA, len);
}

static void on_report_failed(void)
{
    g_app.fw_dirty = true;
}

static void confirm_health_from_report(void)
{
    g_app.ota_health_acked = true;
}

static void release_reboot_after_report(void)
{
    g_app.ota_reboot_ms = app_now();
}

static void clear_confirm_ctx_after_report(void)
{
    ivts_ota_pending_t empty = {0};
    if (storage_ota_pending_save(&empty) == IVTS_OK) { g_app.ota_report_pending = false; }
    else { on_report_failed(); }
}

static void on_firmware_report_acked(bool ok)
{
    if (!ok) {
        on_report_failed();
    } else if (g_app.ota_confirm_pending) {
        confirm_health_from_report();
    } else if (!g_app.fw_dirty && g_app.ota_reboot_ms != 0u) {
        release_reboot_after_report();
    } else if (!g_app.fw_dirty && g_app.ota_report_pending) {
        clear_confirm_ctx_after_report();
    }
}

/**
 * @brief Xử lý kết quả publish: giải phóng ô bay và áp dụng chính sách theo loại bản tin.
 *
 * - RAW live lỗi: đẩy vào offline queue.
 * - RAW replay thành công: yêu cầu storage pop; lỗi thì giữ nguyên trong queue.
 * - Status thành công: ghi nhận để xác nhận image OTA khoẻ.
 * - Firmware và event lỗi: đặt lại cờ dirty để gửi lại.
 */
void app_publish_on_ack(const ivts_event_t *ev)
{
    if (!g_app.pub_inflight || ev->u.mqtt_ack.tx_id != g_app.pub_tx) { return; }   /* ACK không thuộc bản tin đang bay. */
    bool ok = ev->u.mqtt_ack.ok != 0u;
    g_app.pub_inflight = false;
    switch (g_app.pub_kind) {
    case PUB_RAW_LIVE:
        if (!ok) { to_queue(&g_app.pub_rec); }
        break;
    case PUB_RAW_REPLAY:
        if (ok) {                                 /* Chỉ pop sau khi ACK: bảo đảm at-least-once. */
            if (storage_queue_pop(g_app.replay_token) == IVTS_OK) {
                g_app.popped_token = g_app.replay_token;
            }
        }
        break;
    case PUB_STATUS:
        if (ok) { g_app.ota_health_acked = true; }
        else { g_app.status_dirty = true; }
        break;
    case PUB_BOUNDARY:
        if (ok) {
            g_app.ota_health_acked = true;
            if (app_session_on_ack()) { s_boundary_retry_at = 0; }
        }
        break;
    case PUB_CMD_ACK:
        app_cmd_on_ack(ok);
        break;
    case PUB_LOCATION:
        app_cmd_on_location_ack(ok);
        break;
    case PUB_FW:
        on_firmware_report_acked(ok);
        break;
    case PUB_EVENT:
        if (!ok) { g_app.event_dirty = true; }
        break;
    case PUB_ALARM:
        if (ok) {
            ivts_motion_alarm_t empty = {0};
            if (!g_app.alarm_persisted || storage_alarm_save(&empty) == IVTS_OK) {
                g_app.alarm = empty;
                g_app.alarm_persisted = false;
            }
        }
        break;
    default:
        break;
    }
    if (!ok) {
        ESP_LOGW(APP_TAG, "publish kind=%d lỗi err=%d", (int)g_app.pub_kind, (int)ev->u.mqtt_ack.err);
    }
}

void app_publish_poll(void)
{
    bool ok;
    int16_t err;
    if (g_app.pub_inflight && modem_publish_result(g_app.pub_tx, &ok, &err)) {
        ivts_event_t ev = { .type = IVTS_EV_MQTT_ACK };
        ev.u.mqtt_ack.tx_id = g_app.pub_tx;
        ev.u.mqtt_ack.ok = ok ? 1u : 0u;
        ev.u.mqtt_ack.err = err;
        app_publish_on_ack(&ev);
    }
}

void app_publish_control_tick(void)
{
    if ((g_app.ota_reboot_ms != 0u || g_app.ota_confirm_pending) && g_app.fw_dirty &&
        !g_app.pub_inflight && g_app.link == IVTS_LINK_BROKER_UP) {
        app_publish(PUB_FW);
        return;
    }
    if (g_app.alarm.seq != 0u && app_now() >= s_alarm_retry_at) {
        s_alarm_retry_at = app_now() + ALARM_RETRY_MS;
        if (!g_app.alarm_persisted) {
            g_app.alarm_persisted = storage_alarm_save(&g_app.alarm) == IVTS_OK;
        }
        if (!g_app.pub_inflight && g_app.link == IVTS_LINK_BROKER_UP) { app_publish(PUB_ALARM); }
    }
    if (g_app.pub_inflight || g_app.link != IVTS_LINK_BROKER_UP) { return; }
    if (g_app.session.count != 0u) {
        if (!replay_before(&g_app.session.outbox[0]) && app_now() >= s_boundary_retry_at) {
            app_publish(PUB_BOUNDARY);
        }
    } else if (g_app.status_dirty) {
        app_publish(PUB_STATUS);
    } else if (g_app.fw_dirty) {
        app_publish(PUB_FW);
    } else if (g_app.event_dirty) {
        app_publish(PUB_EVENT);
    }
}

void app_publish_latch_alarm(void)
{
    if (!g_app.provisioned || g_app.alarm.seq != 0u) { return; }
    ivts_msg_meta_t m = meta(app_rtc_next_seq());
    g_app.alarm = (ivts_motion_alarm_t){
        .boot_id = m.boot_id, .seq = m.seq, .unix_ms = m.sent_unix_ms, .uptime_ms = (uint32_t)m.uptime_ms,
    };
    g_app.alarm_persisted = storage_alarm_save(&g_app.alarm) == IVTS_OK;
    s_alarm_retry_at = 0;
}

/**
 * @brief Gửi bản ghi trong ô peek nếu nó đứng trước mốc phiên.
 * @return true nếu đọc được ô peek; @p precedes cho biết còn RAW cần xử lý trước mốc.
 */
static bool replay_from_slot(const ivts_session_boundary_t *boundary, bool *precedes)
{
    uint8_t b[IVTS_RECORD_MAX_SIZE];
    size_t n = 0;
    uint32_t token = 0;
    ivts_record_t r;
    if (storage_queue_peek_copy(b, sizeof b, &n, &token) != IVTS_OK) { return false; }
    *precedes = true;
    /* Pop là bất đồng bộ: ô peek còn giữ bản vừa ACK cho đến khi task "storage" xử lý xong,
     * nên bỏ qua token này để không gửi lại. */
    if (token == g_app.popped_token) { return true; }
    if (ivts_record_decode(b, n, &r) != IVTS_OK) {
        if (storage_queue_pop(token) == IVTS_OK) { g_app.popped_token = token; }
        return true;
    }
    /* Mốc đóng phải theo sau dữ liệu của chính phiên. Bridge có thể xóa phiên không có mẫu. */
    if (boundary != NULL && !ivts_record_precedes_boundary(&r, boundary)) {
        *precedes = false;
        return true;
    }
    ivts_msg_meta_t m = { .device_id = g_app.cfg.device_id, .auth_token = g_app.cfg.auth_token };
    size_t len = 0;
    if (ivts_payload_rawdata(&m, &r, NULL, s_buf, sizeof s_buf, &len) == IVTS_OK &&
        send(PUB_RAW_REPLAY, MODEM_TOPIC_RAWDATA, len)) {
        g_app.replay_token = token;
    }
    return true;                                  /* Gửi không được: ô peek giữ nguyên, tick sau thử lại. */
}

/** Xử lý đầu hàng đợi hoặc đợi storage nạp. Không gửi RAW mới hơn mốc `boundary`. */
static bool replay_before(const ivts_session_boundary_t *boundary)
{
    bool writing = storage_queue_push_pending();
    if (storage_queue_pending() == 0u) { return writing; }
    bool precedes;
    if (replay_from_slot(boundary, &precedes)) {
        g_app.replay_requested = false;
        return precedes;
    }
    /* Ô trống: yêu cầu storage nạp. Sau 5 s chưa có QUEUE_READY (bộ đếm pending lệch với nội dung
     * file) thì yêu cầu lại. */
    if (g_app.replay_requested && app_now() - s_peek_asked_at < PEEK_RETRY_MS) { return true; }
    if (storage_queue_request_peek() == IVTS_OK) {
        g_app.replay_requested = true;
        s_peek_asked_at = app_now();
    }
    return true;
}

void app_publish_replay_tick(void)
{
    if (!g_app.pub_inflight && g_app.link == IVTS_LINK_BROKER_UP && g_app.session.count == 0u) {
        (void)replay_before(NULL);
    }
}

/** Storage đã nạp bản ghi vào ô peek: thử replay ngay. */
void app_publish_on_queue_ready(void)
{
    g_app.replay_requested = false;
}
