/**
 * @file obd_ble.c
 * @brief NimBLE lifecycle, GAP scanning and GATT callbacks for ELM327.
 *
 * BLE host callbacks copy their results into task events. The OBD task
 * interprets the events and advances its own session state.
 */
#include "obd_internal.h"
#include "platform/log.h"
#include "host/ble_hs.h"
#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"
#include "os/os_mbuf.h"
#include <stdio.h>
#include <string.h>
#include <strings.h>

static uint8_t s_own_addr_type; /* Written before the host posts its synced event. */

uint8_t obd_ble_own_addr_type(void) { return s_own_addr_type; }

static void on_reset(int reason)
{
    IVTS_LOGW(OBD_TAG, "ble host_reset reason=%d", reason);
}

static void on_sync(void)
{
    if (ble_hs_id_infer_auto(0, &s_own_addr_type) != 0) { return; }
    obd_ble_event_t e = { .type = OBD_BLE_EV_SYNCED };
    (void)obd_task_post(&e);
}

static void host_task(void *param)
{
    (void)param;
    nimble_port_run();               /* Return after nimble_port_stop() stops the host. */
    nimble_port_freertos_deinit();
}

int obd_ble_init(void)
{
    esp_err_t e = nimble_port_init();
    if (e != ESP_OK) {
        IVTS_LOGE(OBD_TAG, "ble init result=fail err=%s", esp_err_to_name(e));
        return -1;
    }
    ble_hs_cfg.reset_cb = on_reset;
    ble_hs_cfg.sync_cb = on_sync;
    nimble_port_freertos_init(host_task);
    IVTS_LOGI(OBD_TAG, "ble power=on");
    return 0;
}

int obd_ble_deinit(void)
{
    int rc = nimble_port_stop();
    if (rc != 0) {
        IVTS_LOGE(OBD_TAG, "ble stop result=fail rc=%d", rc);
        return -1;
    }
    esp_err_t e = nimble_port_deinit();
    if (e != ESP_OK) {
        IVTS_LOGE(OBD_TAG, "ble deinit result=fail err=%s", esp_err_to_name(e));
        return -1;
    }
    IVTS_LOGI(OBD_TAG, "ble power=off");
    return 0;
}

static bool adv_is_candidate(const struct ble_gap_disc_desc *d)
{
    struct ble_hs_adv_fields f;
    if (ble_hs_adv_parse_fields(&f, d->data, d->length_data) != 0) { return false; }
    for (int i = 0; i < f.num_uuids16; i++) {
        if (ble_uuid_u16(&f.uuids16[i].u) == OBD_SERVICE_UUID) { return true; }
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

static void on_disc(const struct ble_gap_disc_desc *disc)
{
    obd_ble_event_t event = { .type = OBD_BLE_EV_ADV };
    event.advertisement.address[0] = disc->addr.type;
    memcpy(&event.advertisement.address[1], disc->addr.val, 6);
    if (obd_config()->target_addr[0] != '\0' ? !obd_ble_addr_matches(event.advertisement.address, obd_config()->target_addr)
                                          : !adv_is_candidate(disc)) { return; }
    (void)obd_task_post(&event);
}

static void on_connect(const struct ble_gap_event *gap)
{
    obd_ble_event_t event = { .type = OBD_BLE_EV_CONNECTED, .status = (int16_t)gap->connect.status,
                    .conn = gap->connect.conn_handle };
    (void)obd_task_post(&event);
}

static void on_disconnect(const struct ble_gap_event *gap)
{
    obd_ble_event_t event = { .type = OBD_BLE_EV_DISCONNECTED, .status = (int16_t)gap->disconnect.reason,
                    .conn = gap->disconnect.conn.conn_handle };
    (void)obd_task_post(&event);
}

static void on_notify_rx(const struct ble_gap_event *gap)
{
    obd_ble_event_t event = { .type = OBD_BLE_EV_NOTIFY, .conn = gap->notify_rx.conn_handle, .notification.handle = gap->notify_rx.attr_handle };
    uint16_t len = OS_MBUF_PKTLEN(gap->notify_rx.om);
    if (len > sizeof event.notification.data || os_mbuf_copydata(gap->notify_rx.om, 0, len, event.notification.data) != 0) {
        event.status = BLE_HS_EMSGSIZE;
    } else {
        event.notification.len = (uint8_t)len;
    }
    (void)obd_task_post(&event);
}

static int gap_cb(struct ble_gap_event *event, void *arg)
{
    (void)arg;
    switch (event->type) {
    case BLE_GAP_EVENT_DISC: on_disc(&event->disc); break;
    case BLE_GAP_EVENT_DISC_COMPLETE: {
        const obd_ble_event_t done = { .type = OBD_BLE_EV_SCAN_DONE };
        (void)obd_task_post(&done);
        break;
    }
    case BLE_GAP_EVENT_CONNECT: on_connect(event); break;
    case BLE_GAP_EVENT_DISCONNECT: on_disconnect(event); break;
    case BLE_GAP_EVENT_NOTIFY_RX: on_notify_rx(event); break;
    default: break;
    }
    return 0;
}

int obd_ble_scan(void)
{
    struct ble_gap_disc_params p = { .passive = 0, .filter_duplicates = 1 };
    return ble_gap_disc(obd_ble_own_addr_type(), 10000, &p, gap_cb, NULL);
}

void obd_ble_scan_stop(void)
{
    if (ble_gap_disc_active()) { (void)ble_gap_disc_cancel(); }
}

int obd_ble_connect(const uint8_t addr[7])
{
    ble_addr_t a = { .type = addr[0] };
    memcpy(a.val, &addr[1], 6);
    obd_ble_scan_stop();                      /* Disable BLE controller activity before entering sleep. */
    return ble_gap_connect(obd_ble_own_addr_type(), &a, 10000, NULL, gap_cb, NULL);
}

void obd_ble_disconnect(uint16_t conn)
{
    (void)ble_gap_terminate(conn, BLE_ERR_REM_USER_CONN_TERM);
}

bool obd_ble_addr_matches(const uint8_t addr[7], const char *want)
{
    if (want[0] == '\0') { return true; }
    char s[18];
    /* NimBLE stores addresses least-significant byte first. Print the last byte first. */
    snprintf(s, sizeof s, "%02X:%02X:%02X:%02X:%02X:%02X", addr[6], addr[5], addr[4], addr[3], addr[2], addr[1]);
    return strcasecmp(s, want) == 0;
}

static int svc_cb(uint16_t conn, const struct ble_gatt_error *err, const struct ble_gatt_svc *svc, void *arg)
{
    (void)arg;
    obd_ble_event_t e = { .conn = conn };
    if (err->status == 0 && svc != NULL) {
        e.type = OBD_BLE_EV_SVC;
        e.service.start_handle = svc->start_handle;
        e.service.end_handle = svc->end_handle;
    } else {
        e.type = OBD_BLE_EV_DISC_DONE;
        e.status = (int16_t)((err->status == BLE_HS_EDONE) ? 0 : err->status);
    }
    (void)obd_task_post(&e);
    return 0;
}

static int chr_cb(uint16_t conn, const struct ble_gatt_error *err, const struct ble_gatt_chr *chr, void *arg)
{
    (void)arg;
    obd_ble_event_t e = { .conn = conn };
    if (err->status == 0 && chr != NULL) {
        e.type = OBD_BLE_EV_CHR;
        e.characteristic.definition_handle = chr->def_handle;
        e.characteristic.value_handle = chr->val_handle;
        e.characteristic.uuid16 = (chr->uuid.u.type == BLE_UUID_TYPE_16) ? ble_uuid_u16(&chr->uuid.u) : 0;
    } else {
        e.type = OBD_BLE_EV_DISC_DONE;
        e.status = (int16_t)((err->status == BLE_HS_EDONE) ? 0 : err->status);
    }
    (void)obd_task_post(&e);
    return 0;
}

static int dsc_cb(uint16_t conn, const struct ble_gatt_error *err, uint16_t chr_val_handle,
                  const struct ble_gatt_dsc *dsc, void *arg)
{
    (void)arg;
    (void)chr_val_handle;
    obd_ble_event_t e = { .conn = conn };
    if (err->status == 0 && dsc != NULL) {
        e.type = OBD_BLE_EV_DSC;
        e.descriptor.handle = dsc->handle;
        e.descriptor.uuid16 = (dsc->uuid.u.type == BLE_UUID_TYPE_16) ? ble_uuid_u16(&dsc->uuid.u) : 0;
    } else {
        e.type = OBD_BLE_EV_DISC_DONE;
        e.status = (int16_t)((err->status == BLE_HS_EDONE) ? 0 : err->status);
    }
    (void)obd_task_post(&e);
    return 0;
}

static int write_cb(uint16_t conn, const struct ble_gatt_error *err, struct ble_gatt_attr *attr, void *arg)
{
    (void)attr;
    (void)arg;
    obd_ble_event_t e = { .type = OBD_BLE_EV_WRITE_DONE, .conn = conn, .status = (int16_t)err->status };
    (void)obd_task_post(&e);
    return 0;
}

int obd_ble_disc_svc(uint16_t conn)
{
    static const ble_uuid16_t svc = BLE_UUID16_INIT(OBD_SERVICE_UUID);
    return ble_gattc_disc_svc_by_uuid(conn, &svc.u, svc_cb, NULL);
}

int obd_ble_disc_chrs(uint16_t conn, uint16_t start, uint16_t end)
{
    return ble_gattc_disc_all_chrs(conn, start, end, chr_cb, NULL);
}

int obd_ble_disc_dscs(uint16_t conn, uint16_t value_handle, uint16_t end)
{
    return ble_gattc_disc_all_dscs(conn, value_handle, end, dsc_cb, NULL);
}

int obd_ble_enable_notify(uint16_t conn, uint16_t cccd)
{
    static const uint8_t on[2] = { 0x01, 0x00 };   /* Set CCCD bit 0 to enable notifications. */
    return ble_gattc_write_flat(conn, cccd, on, sizeof on, write_cb, NULL);
}

int obd_ble_write(uint16_t conn, uint16_t handle, const char *s)
{
    return ble_gattc_write_no_rsp_flat(conn, handle, s, (uint16_t)strlen(s));
}
