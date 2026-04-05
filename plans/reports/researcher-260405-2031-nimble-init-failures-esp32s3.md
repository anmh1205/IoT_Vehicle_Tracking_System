# Research Report — ESP-IDF NimBLE init failures on ESP32-S3

## Scope
Research root causes and fixes for `esp_nimble_hci_init()` returning `ESP_FAIL` on ESP32-S3.

## Official docs found
- NimBLE host API guide
  - https://docs.espressif.com/projects/esp-idf/en/stable/esp32/api-reference/bluetooth/nimble/index.html
- ESP32-S3 Bluetooth API overview
  - https://docs.espressif.com/projects/esp-idf/en/stable/esp32s3/api-reference/bluetooth/index.html
- Official NimBLE example README
  - https://github.com/espressif/esp-idf/blob/master/examples/bluetooth/nimble/bleprph/README.md

## Official init sequence
From Espressif docs, the safe order is:
1. Enable NimBLE in menuconfig.
2. Initialize NVS first.
3. Call `nimble_port_init()`.
4. Configure host callbacks / app setup.
5. Start the host thread with `nimble_port_freertos_init()`.
6. For teardown: deinit the NimBLE host first, then call `esp_nimble_hci_deinit()`.

Key constraint:
- `esp_nimble_hci_init()` is the VHCI transport setup between NimBLE host and ESP controller.
- The normal NimBLE RAM transport is not suitable on ESP-IDF; use the ESP port path.
- ESP32-S3 supports NimBLE LE-only stack; Bluedroid is the other host option.

## Likely root causes of `ESP_FAIL`
Highest-probability causes, based on docs + known ESP-IDF patterns:
1. Controller state mismatch
   - controller already initialized
   - controller not enabled yet
   - controller deinitialized/reused incorrectly
2. NVS not ready
   - controller init depends on NVS
3. Stack conflict / dual-stack config
   - Bluedroid and NimBLE both enabled
   - wrong host selected in menuconfig
4. Bad lifecycle order
   - calling HCI init before controller/HCI prerequisites
   - deinit order reversed, then re-init in same boot path
5. Memory release conflict
   - controller memory not released or released too early for chosen stack path
6. Task/thread lifecycle issues
   - NimBLE host thread not started as expected
   - host/controller sync not completed before app-specific setup
7. Power/sleep interaction
   - early low-power transitions or RF power state changes during bring-up
8. Build/config mismatch on target
   - not actually building for ESP32-S3 target
   - stale sdkconfig from another target

## Minimal diagnostics to add
Add logs around each stage; keep them small and unambiguous:

- target / config
  - `esp_get_idf_version()`
  - current chip / target from build logs
  - selected host stack from menuconfig if available
- NVS
  - log return of `nvs_flash_init()`
  - if `ESP_ERR_NVS_NO_FREE_PAGES` or `ESP_ERR_NVS_NEW_VERSION_FOUND`, erase + reinit
- controller init path
  - log return of `esp_bt_controller_init()`
  - log return of `esp_bt_controller_enable()`
  - log return of `esp_bt_controller_mem_release()` if used
- NimBLE transport
  - log return of `esp_nimble_hci_init()` with decoded error string
- NimBLE host
  - log return of `nimble_port_init()`
  - log when host sync callback fires
  - log when `bleprph_on_sync` / equivalent app sync hook runs
- teardown / restart path
  - log every deinit call and its return code

Recommended log format:
- one line per API call
- include function name, return code, and stage label
- add a single “boot path” marker so repeated init attempts are easy to spot

## Official example to compare against
Use the NimBLE BLE peripheral example as reference:
- `examples/bluetooth/nimble/bleprph`
- It demonstrates the standard host/controller bring-up flow and sync callback usage.
- README notes:
  - choose target first with `idf.py set-target <chip>`
  - enable NimBLE host in menuconfig
  - use the sync callback (`bleprph_on_sync`) for host-controller-synced setup
  - enable privacy / RPA only after sync

## Actionable checklist
- [ ] Confirm `idf.py set-target esp32s3`
- [ ] Confirm NimBLE host selected, Bluedroid disabled if not needed
- [ ] Ensure `nvs_flash_init()` runs before Bluetooth init
- [ ] Log every controller/HCI init return code
- [ ] Verify no double-init path on reboot/reconnect
- [ ] Compare boot order against `bleprph`
- [ ] If failure persists, capture the exact first failing API and its error code

## Unresolved questions
- Exact code path currently used in the project for controller init / memory release.
- Whether the failure happens on first boot, soft restart, or only after reconnect/reinit.
- Whether power-save or light-sleep is enabled during Bluetooth bring-up.
