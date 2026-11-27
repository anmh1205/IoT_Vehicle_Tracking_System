#include "obd_ble.h"
#include "obd_task.h"
#include "host/ble_hs.h"

#include <string.h>

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
    static const uint8_t on[2] = { 0x01, 0x00 };   /* Bit 0 của CCCD: notification. */
    return ble_gattc_write_flat(conn, cccd, on, sizeof on, write_cb, NULL);
}

int obd_ble_write(uint16_t conn, uint16_t handle, const char *s)
{
    return ble_gattc_write_no_rsp_flat(conn, handle, s, (uint16_t)strlen(s));
}
