# Firmware Comment Audit Checklist

**Date**: 2026-05-01 17:34
**Task**: Improve comment coverage from 68% to 85%+

---

## Critical Priority (0% - Must Fix)

- [ ] main/main.c - Add Doxygen file header comment
- [ ] main/main.c - Add @brief, @param, @return for app_main()

## High Priority (8% - Poor)

### app-core/src/*.c - Add block comments to all functions

- [ ] app-core/src/state_machine.c
- [ ] app-core/src/state_runtime_context.c
- [ ] app-core/src/tracker_mqtt.c
- [ ] app-core/src/tracker_ble.c
- [ ] app-core/src/tracker_sdmgr.c
- [ ] app-core/src/tracker_i2c.c
- [ ] app-core/src/tracker_pwr_mgmt.c
- [ ] app-core/src/tracker_gps.c
- [ ] app-core/src/tracker_sensors.c
- [ ] app-core/src/tracker_events.c
- [ ] app-core/src/tracker_config.c
- [ ] app-core/src/tracker_init.c

## Medium Priority (10% - Poor)

- [ ] adapter-kv-nvs/include/nvs_store_keys.h - Add Doxygen comments
- [ ] adapter-kv-nvs/src/nvs_store_keys.c - Add Doxygen comments

## Maintain Excellence (88-95% - Already Good)

### adapter-ble-obd-nimble - Maintain 90%+
- [ ] adapter-ble-obd-nimble/src/ble_mgr.c - Add inline comments
- [ ] adapter-ble-obd-nimble/src/ble_util.c - Add inline comments

### adapter-modem-sim7600-at - Maintain 90%+
- [ ] adapter-modem-sim7600-at/src/modem_at_util.c - Improve comments

### adapter-mqtt-sim7600-at - Improve to 80%+
- [ ] adapter-mqtt-sim7600-at/src/mqtt_publish.c - Add function documentation
- [ ] adapter-mqtt-sim7600-at/src/mqtt_session.c - Add function documentation
- [ ] adapter-mqtt-sim7600-at/src/mqtt_urc_parser.c - Add function documentation

### shared-kernel - Maintain 80%+
- [ ] shared-kernel/src/kv_store.c - Improve comments

---

## Verification

- [ ] Run Doxygen to generate documentation
- [ ] Verify all public APIs have @brief tags
- [ ] Check all @param tags match function signatures
- [ ] Ensure no TODO comments left unfinished
- [ ] Re-run audit to confirm improvement to 85%+
