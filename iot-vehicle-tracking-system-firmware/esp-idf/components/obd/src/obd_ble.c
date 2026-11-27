#include "obd_priv.h"
#include <stdio.h>
#include <string.h>
#include <strings.h>
#include "esp_log.h"
#include "host/ble_hs.h"
#include "host/util/util.h"
#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"

/**
 * @file obd_ble.c
 * @brief Lớp NimBLE central cho adapter ELM327 BLE.
 *
 * Adapter được hỗ trợ dùng service 0x18F0, characteristic notify RX 0x2AF0 và characteristic ghi
 * TX 0x2AF1. Adapter của hãng khác có thể dùng bộ UUID FFF0/FFF1/FFF2 và chưa được hỗ trợ.
 *
 * ## Mô hình thực thi
 *
 * - Callback (on_reset, on_sync, gap_cb, svc_cb, chr_cb, dsc_cb, write_cb) chạy trong host task
 *   NimBLE. Chúng chỉ sao chép dữ liệu vào bev_t và gọi obd_post() rồi trả về; không chờ, không
 *   gọi API GATT đồng bộ, không gọi sink của app.
 * - Hàm obd_ble_* (scan, connect, discovery, write...) được gọi từ task "obd". API host NimBLE tự
 *   khoá bằng ble_hs_lock nên gọi từ task khác host task là hợp lệ.
 * - s_own_addr_type ghi một lần trong on_sync() (host task) và chỉ đọc sau đó; task "obd" chỉ
 *   gọi obd_ble_scan() và obd_ble_connect() sau khi nhận BEV_SYNCED, tức sau lần ghi đó.
 */

#define UUID_SVC   0x18F0   /* Service của adapter ELM327 BLE. */

static uint8_t s_own_addr_type;   /* Loại địa chỉ của thiết bị, suy ra khi host đồng bộ. */

/** Host NimBLE bị reset (controller lỗi hoặc mất đồng bộ). Chỉ ghi log; stack tự đồng bộ lại. */
static void on_reset(int reason)
{
    ESP_LOGW(OBD_TAG, "nimble reset %d", reason);
}

/** Host đã đồng bộ với controller; từ đây mới gọi được GAP. Báo cho task "obd" bằng BEV_SYNCED. */
static void on_sync(void)
{
    if (ble_hs_id_infer_auto(0, &s_own_addr_type) != 0) { return; }
    bev_t e = { .type = BEV_SYNCED };
    (void)obd_post(&e);
}

/** Thân host task NimBLE. */
static void host_task(void *param)
{
    (void)param;
    nimble_port_run();               /* Trả về khi nimble_port_stop() được gọi. */
    nimble_port_freertos_deinit();
}

/**
 * Khởi tạo controller và host NimBLE, đăng ký callback và tạo host task.
 * @return 0 nếu thành công, -1 nếu nimble_port_init() thất bại.
 */
int obd_ble_init(void)
{
    esp_err_t e = nimble_port_init();
    if (e != ESP_OK) {
        ESP_LOGE(OBD_TAG, "nimble_port_init: %s", esp_err_to_name(e));
        return -1;
    }
    ble_hs_cfg.reset_cb = on_reset;
    ble_hs_cfg.sync_cb = on_sync;
    nimble_port_freertos_init(host_task);
    ESP_LOGI(OBD_TAG, "BLE on");
    return 0;
}

int obd_ble_deinit(void)
{
    int rc = nimble_port_stop();
    if (rc != 0) {
        ESP_LOGE(OBD_TAG, "nimble_port_stop: %d", rc);
        return -1;
    }
    esp_err_t e = nimble_port_deinit();
    if (e != ESP_OK) {
        ESP_LOGE(OBD_TAG, "nimble_port_deinit: %s", esp_err_to_name(e));
        return -1;
    }
    ESP_LOGI(OBD_TAG, "BLE off");
    return 0;
}

/** Dò cả adapter đặt tên trong scan response nhưng không quảng bá UUID của service. */
static bool adv_is_candidate(const struct ble_gap_disc_desc *d)
{
    struct ble_hs_adv_fields f;
    if (ble_hs_adv_parse_fields(&f, d->data, d->length_data) != 0) { return false; }
    for (int i = 0; i < f.num_uuids16; i++) {
        if (ble_uuid_u16(&f.uuids16[i].u) == UUID_SVC) { return true; }
    }
    static const char *const names[] = { "vgate", "icar", "obd", "elm327", "vlink", "viecar", "kw9" };
    for (size_t i = 0; f.name != NULL && i < sizeof names / sizeof names[0]; i++) {
        size_t n = strlen(names[i]);
        for (size_t offset = 0; offset + n <= f.name_len; offset++) {
            if (strncasecmp((const char *)f.name + offset, names[i], n) == 0) { return true; }
        }
    }
    return false;
}

/* ---- Callback chạy trong host task NimBLE: chỉ sao chép dữ liệu rồi trả về ---- */

/**
 * Callback GAP: quảng bá, kết nối, ngắt kết nối và notification.
 *
 * Khi chưa chỉ định địa chỉ đích, dùng service đã biết hoặc tên quảng bá OBD.
 * Notification lớn hơn bộ đệm được báo lỗi để task loại toàn bộ phản hồi.
 */
static int gap_cb(struct ble_gap_event *ev, void *arg)
{
    (void)arg;
    bev_t e = {0};
    switch (ev->type) {
    case BLE_GAP_EVENT_DISC:
        e.type = BEV_ADV;
        e.addr[0] = ev->disc.addr.type;
        memcpy(&e.addr[1], ev->disc.addr.val, 6);
        if (g_obd_cfg.target_addr[0] != '\0' ? !obd_ble_addr_matches(e.addr, g_obd_cfg.target_addr)
                                             : !adv_is_candidate(&ev->disc)) { return 0; }
        break;
    case BLE_GAP_EVENT_DISC_COMPLETE:
        e.type = BEV_SCAN_DONE;
        break;
    case BLE_GAP_EVENT_CONNECT:
        e.type = BEV_CONNECTED;
        e.status = (int16_t)ev->connect.status;
        e.conn = ev->connect.conn_handle;
        break;
    case BLE_GAP_EVENT_DISCONNECT:
        e.type = BEV_DISCONNECTED;
        e.conn = ev->disconnect.conn.conn_handle;
        e.status = (int16_t)ev->disconnect.reason;
        break;
    case BLE_GAP_EVENT_NOTIFY_RX: {
        e.type = BEV_NOTIFY;
        e.conn = ev->notify_rx.conn_handle;
        e.h_start = ev->notify_rx.attr_handle;
        uint16_t n = OS_MBUF_PKTLEN(ev->notify_rx.om);
        if (n > sizeof e.data || os_mbuf_copydata(ev->notify_rx.om, 0, n, e.data) != 0) {
            e.status = BLE_HS_EMSGSIZE;
        } else {
            e.len = (uint8_t)n;
        }
        break;
    }
    default:
        return 0;
    }
    (void)obd_post(&e);
    return 0;
}

/** Callback discovery service: mỗi service thành BEV_SVC; hết danh sách hoặc lỗi thành BEV_DISC_DONE. */
static int svc_cb(uint16_t conn, const struct ble_gatt_error *err, const struct ble_gatt_svc *svc, void *arg)
{
    (void)arg;
    bev_t e = { .conn = conn };
    if (err->status == 0 && svc != NULL) {
        e.type = BEV_SVC;
        e.h_start = svc->start_handle;
        e.h_end = svc->end_handle;
    } else {
        e.type = BEV_DISC_DONE;
        e.status = (int16_t)((err->status == BLE_HS_EDONE) ? 0 : err->status);
    }
    (void)obd_post(&e);
    return 0;
}

/** Callback discovery characteristic: mỗi characteristic thành BEV_CHR; kết thúc thành BEV_DISC_DONE. */
static int chr_cb(uint16_t conn, const struct ble_gatt_error *err, const struct ble_gatt_chr *chr, void *arg)
{
    (void)arg;
    bev_t e = { .conn = conn };
    if (err->status == 0 && chr != NULL) {
        e.type = BEV_CHR;
        e.h_start = chr->def_handle;
        e.h_end = chr->val_handle;
        e.uuid16 = (chr->uuid.u.type == BLE_UUID_TYPE_16) ? ble_uuid_u16(&chr->uuid.u) : 0;
    } else {
        e.type = BEV_DISC_DONE;
        e.status = (int16_t)((err->status == BLE_HS_EDONE) ? 0 : err->status);
    }
    (void)obd_post(&e);
    return 0;
}

/** Callback discovery descriptor: mỗi descriptor thành BEV_DSC; kết thúc thành BEV_DISC_DONE. */
static int dsc_cb(uint16_t conn, const struct ble_gatt_error *err, uint16_t chr_val_handle,
                  const struct ble_gatt_dsc *dsc, void *arg)
{
    (void)arg;
    (void)chr_val_handle;
    bev_t e = { .conn = conn };
    if (err->status == 0 && dsc != NULL) {
        e.type = BEV_DSC;
        e.h_start = dsc->handle;
        e.uuid16 = (dsc->uuid.u.type == BLE_UUID_TYPE_16) ? ble_uuid_u16(&dsc->uuid.u) : 0;
    } else {
        e.type = BEV_DISC_DONE;
        e.status = (int16_t)((err->status == BLE_HS_EDONE) ? 0 : err->status);
    }
    (void)obd_post(&e);
    return 0;
}

/** Callback kết quả ghi GATT có phản hồi: thành BEV_WRITE_DONE kèm status. */
static int write_cb(uint16_t conn, const struct ble_gatt_error *err, struct ble_gatt_attr *attr, void *arg)
{
    (void)attr;
    (void)arg;
    bev_t e = { .type = BEV_WRITE_DONE, .conn = conn, .status = (int16_t)err->status };
    (void)obd_post(&e);
    return 0;
}

/* ---- Lệnh gọi từ task "obd" ---- */

/** Quét chủ động tối đa 10 s, bỏ qua gói trùng. Mỗi gói hợp lệ thành BEV_ADV. */
int obd_ble_scan(void)
{
    struct ble_gap_disc_params p = { .passive = 0, .filter_duplicates = 1 };
    return ble_gap_disc(s_own_addr_type, 10000, &p, gap_cb, NULL);
}

/** Dừng quét nếu đang quét. */
void obd_ble_scan_stop(void)
{
    if (ble_gap_disc_active()) { (void)ble_gap_disc_cancel(); }
}

/** Dừng quét rồi kết nối tới @p addr (loại địa chỉ + 6 byte), timeout 10 s. */
int obd_ble_connect(const uint8_t addr[7])
{
    ble_addr_t a = { .type = addr[0] };
    memcpy(a.val, &addr[1], 6);
    obd_ble_scan_stop();                      /* Controller không cho vừa quét vừa kết nối. */
    return ble_gap_connect(s_own_addr_type, &a, 10000, NULL, gap_cb, NULL);
}

/** Tìm service UUID_SVC. Kết quả về qua BEV_SVC rồi BEV_DISC_DONE. */
int obd_ble_disc_svc(uint16_t conn)
{
    static const ble_uuid16_t svc = BLE_UUID16_INIT(UUID_SVC);
    return ble_gattc_disc_svc_by_uuid(conn, &svc.u, svc_cb, NULL);
}

/** Tìm mọi characteristic trong dải handle. Kết quả về qua BEV_CHR rồi BEV_DISC_DONE. */
int obd_ble_disc_chrs(uint16_t conn, uint16_t start, uint16_t end)
{
    return ble_gattc_disc_all_chrs(conn, start, end, chr_cb, NULL);
}

/** Tìm mọi descriptor trong dải handle. Kết quả về qua BEV_DSC rồi BEV_DISC_DONE. */
int obd_ble_disc_dscs(uint16_t conn, uint16_t value_handle, uint16_t end)
{
    return ble_gattc_disc_all_dscs(conn, value_handle, end, dsc_cb, NULL);
}

/** Bật notification bằng cách ghi 0x0001 vào CCCD. Kết quả về qua BEV_WRITE_DONE. */
int obd_ble_enable_notify(uint16_t conn, uint16_t cccd)
{
    static const uint8_t on[2] = { 0x01, 0x00 };   /* Bit 0 của CCCD: notification. */
    return ble_gattc_write_flat(conn, cccd, on, sizeof on, write_cb, NULL);
}

/** Ghi chuỗi @p s (không gồm NUL) tới @p handle bằng write-without-response. */
int obd_ble_write(uint16_t conn, uint16_t handle, const char *s)
{
    return ble_gattc_write_no_rsp_flat(conn, handle, s, (uint16_t)strlen(s));
}

/** Yêu cầu ngắt kết nối; kết quả về qua BEV_DISCONNECTED. */
void obd_ble_disconnect(uint16_t conn)
{
    (void)ble_gap_terminate(conn, BLE_ERR_REM_USER_CONN_TERM);
}

/** Xem obd_priv.h. So sánh không phân biệt hoa thường. */
bool obd_ble_addr_matches(const uint8_t addr[7], const char *want)
{
    if (want[0] == '\0') { return true; }
    char s[18];
    /* NimBLE lưu địa chỉ dạng little-endian nên byte cuối của val được in trước. */
    snprintf(s, sizeof s, "%02X:%02X:%02X:%02X:%02X:%02X", addr[6], addr[5], addr[4], addr[3], addr[2], addr[1]);
    return strcasecmp(s, want) == 0;
}
