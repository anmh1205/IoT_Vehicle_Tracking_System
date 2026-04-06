## Code Review Summary

### Scope
- Files: `/e/anmh1205/IoT_Vehicle_Tracking_System/iot-vehicle-tracking-system-firmware/main/inc/pin_map.h`
- Runtime sanity check: `modem_at.c`, `power_mgr.c`, `imu_lis3dsh.c`, `sd_log_store.c`, `adc_reader.c`, `state_machine.c`
- Focus: pin mapping correctness + regression risk
- Scout findings: deep-sleep wakeup path and strap-pin behavior are main edge risks

### Overall Assessment
Mapping in `pin_map.h` matches expected intent and has no duplicate active GPIO assignments. Main regression risk is IMU INT moved to `GPIO36` while sleep wakeup uses `esp_sleep_enable_ext0_wakeup()`, which typically requires RTC-capable IO.

### Critical Issues
- None confirmed from static code path alone.

### High Priority
1. **Potential deep-sleep wake regression**
   - `state_machine.c` calls `esp_sleep_enable_ext0_wakeup(PIN_LIS3DSH_INT, 1)`.
   - `PIN_LIS3DSH_INT` is now `GPIO36`.
   - Datasheet RTC IO function table strongly suggests `GPIO36` is not RTC IO on ESP32-S3.
   - Impact: motion wake from deep sleep may fail at runtime.

### Medium Priority
1. **Boot/strap sensitivity on IGN pin**
   - `PIN_IGN_IN` moved to `GPIO3` (strap-related pin per datasheet notes).
   - If ignition divider drives this line strongly during reset, early-boot behavior/JTAG source strap can be affected.

2. **Pin-map centralization changed SD behavior source**
   - `sd_log_store.c` now uses `pin_map.h` constants instead of `CONFIG_TRACKER_SDMMC_*`.
   - This is still simple and coherent, but removes runtime-config flexibility from sdkconfig route.

### Low Priority
- None.

### Edge Cases Found by Scout
- Deep sleep with IMU wake enabled but RTC incompatibility on INT pin.
- Ignition line active during reset could alter strap interpretation.
- DTR/PWRKEY/RESET moved to high-number GPIOs (34/35) that can be board/package-sensitive across ESP32-S3 variants.

### Positive Observations
- Expected mapping intent is met exactly:
  - `PIN_IGN_IN -> GPIO3`
  - `PIN_MODEM_TX/RX -> GPIO17/GPIO18`
  - `I2C SDA/SCL -> GPIO2/GPIO1`
  - `SDMMC -> GPIO7..GPIO13`
  - `PIN_MODEM_DTR/PWRKEY/RESET -> GPIO21/GPIO34/GPIO35`
  - `PIN_MODEM_STATUS/NETLIGHT -> GPIO_NUM_NC`
- No duplicate GPIO among active mapped pins.
- Call-sites are consistent with new constants (UART/I2C/SD/power control).

### Recommended Actions
1. Validate deep-sleep motion wake on real board immediately (highest priority).
2. Confirm `GPIO36` RTC wake capability for this exact ESP32-S3 package/board design; if not supported, move `PIN_LIS3DSH_INT` back to RTC-capable GPIO.
3. Run reset/boot smoke test with IGN high/low to ensure `GPIO3` strap behavior is safe.

### Metrics
- Type Coverage: N/A (C firmware)
- Test Coverage: Not measured in this review
- Linting Issues: Not measured in this review

### Unresolved Questions
- Is `GPIO36` intentionally selected despite ext0 wake constraints, with a known workaround?
- Has hardware validated that IGN divider on `GPIO3` does not break strap behavior at reset?
