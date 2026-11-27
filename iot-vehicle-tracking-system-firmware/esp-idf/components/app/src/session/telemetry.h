/**
 * @file src/session/telemetry.h
 * @brief Application telemetry snapshot and RAW record capture interfaces.
 *
 * Dispatch and runtime update the snapshot on the app task. The publisher borrows it or captures
 * a caller-owned record with a sequence for replay. The snapshot applies validity and age checks
 * to adapter data. Acquisition, encoding and offline storage stay with their respective modules.
 */
#pragma once
#include "ivts_core/event/event.h"
#include "ivts_core/fsm/axes.h"
#include "ivts_core/model/telemetry.h"
#include "ivts_core/model/record.h"

/**
 * @brief Apply component measurements and link events to the snapshot.
 *
 * A GNSS event can set an untrusted RTC. A BLE disconnect clears cached OBD measurements and diagnostic
 * validity.
 *
 * @param event Non-null event borrowed for the call. Relevant measurements are copied.
 *
 * @note Context: App task. Blocking: a GNSS event can issue up to five RTC transfers, each with a 100 ms I2C
 * lock
 * and 50 ms transfer timeout. An OBD diagnostic event can wait on its mutex without a timeout.
 */
void app_telemetry_on_event(const ivts_event_t *event);
/**
 * @brief Update reported ignition, motion and vehicle state.
 *
 * @param axes Non-null runtime axes borrowed while deriving the reported state.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_telemetry_set_axes(const ivts_axes_t *axes);
/**
 * @brief Update OBD age and expire stale GNSS fixes.
 *
 * OBD age saturates at UINT32_MAX, which also represents a missing sample. GNSS validity expires when
 * the fix timestamp is older than three configured poll periods.
 *
 * @param now_ms Current monotonic uptime in milliseconds.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_telemetry_refresh(uint64_t now_ms);
/**
 * @brief Borrow the current telemetry snapshot.
 *
 * @return Read-only app-owned storage. Callers must copy values they need after a subsequent snapshot update.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
const ivts_telemetry_t *app_telemetry_view(void);
/**
 * @brief Set the cloud-facing device state and sleep mode.
 *
 * @param device Current device state to report.
 * @param sleep Selected sleep mode or IVTS_SLEEP_NONE.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_telemetry_set_device(ivts_device_state_t device, ivts_sleep_mode_t sleep);
/**
 * @brief Clear the accumulated IMU acceleration peak after record capture.
 *
 * Subsequent power and motion events contribute to the next peak.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
void app_telemetry_consume_imu_peak(void);

/**
 * @brief Capture a RAW record and allocate its message sequence.
 *
 * Include OBD measurements only while BLE and ELM327 are ready and the sample is at most 30000 ms old.
 * Copy the current session identity when ignition is ON and tracking is enabled. Leave the IMU peak intact.
 *
 * @param[out] record Non-null caller-owned record fully initialized on return.
 *
 * @note Context: App task. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a 50 ms
 * transfer timeout.
 */
void app_record_capture(ivts_record_t *record);
