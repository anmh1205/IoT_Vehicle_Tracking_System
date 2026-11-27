/**
 * @file src/session/motion_alarm.h
 * @brief Application motion alarm persistence and publish hooks.
 *
 * Boot restores the durable alarm. The app task latches it, presents its borrowed record to the
 * publisher and applies the resulting ACK. Record persistence can wait on NVS. The FSM decides
 * when an alarm begins and the publisher owns message transport.
 */
#pragma once
#include "ivts_core/event/event.h"

/**
 * @brief Restore the retained motion alarm at startup.
 *
 * A missing or unreadable record leaves no pending alarm.
 *
 * @note Context: Startup task. Blocking: synchronous NVS access with no timeout at this layer.
 */
void app_alarm_restore(void);
/**
 * @brief Latch a motion alarm for a provisioned device.
 *
 * Keep the current alarm when one is already pending. Allocate an identity before attempting to persist a new
 * alarm.
 *
 * @param provisioned Device provisioning flag. False suppresses latching.
 * @param boot_id Identity of the boot that produces the alarm.
 *
 * @note Context: App task. Blocking: up to two RTC reads, each with a 100 ms I2C lock timeout and a 50 ms
 * transfer timeout, then synchronous NVS access.
 */
void app_alarm_latch(bool provisioned, uint32_t boot_id);
/**
 * @brief Retry alarm persistence and determine whether a publish attempt is due.
 *
 * Advance the 5000 ms attempt timer when due. A send attempt remains eligible even if persistence fails.
 *
 * @retval true when a pending alarm is due for an attempt.
 * @retval false when idle or before the next attempt time.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
bool app_alarm_tick(void);
/**
 * @brief Check for a pending alarm.
 *
 * @retval true when the stored alarm has a nonzero sequence.
 * @retval false when no alarm is pending.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool app_alarm_has_unsent(void);
/**
 * @brief Borrow the current alarm record.
 *
 * @return Read-only app-owned storage that can change on latch or ACK. Sequence zero means empty.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
const ivts_motion_alarm_t *app_alarm_view(void);
/**
 * @brief Clear the pending alarm after successful delivery.
 *
 * If the alarm reached NVS, persist a cleared record before clearing RAM. Keep the alarm if that write fails.
 *
 * @param ok True for a successful modem publish result, false for failure.
 *
 * @note Context: App task. Blocking: synchronous NVS access with no timeout at this layer.
 */
void app_alarm_on_ack(bool ok);
