/**
 * @file status.h
 * @brief Human-readable periodic status lines for the console UART.
 *
 * The app task logs one line per group so a reader can follow vehicle, power,
 * position and OBD state without decoding cloud payloads:
 *
 * @code
 * status fsm=DRIVING dev=ACTIVE ign=ON motion=MOVING vehicle=MOVING_ON link=BROKER_UP queue=0 up=00:12:34
 * status net link=BROKER_UP publishing=no control_pending=no queue=0 unflushed=no ota=no tracking=yes
 * status time utc=2026-11-27T08:01:12Z rtc=trusted
 * status power vehicle=13.52V device=4.05V
 * status gnss fix=yes sats=9 pos=21.0285123,105.8542000 speed=36.0km/h course=182.5
 * status obd ble=up elm=ready ecu=LIVE rpm=1500 speed=36km/h coolant=89C fuel=54% load=22%
 * status sys heap=142kB heap_min=118kB event_drops=0 cmd_drops=0
 * @endcode
 *
 * Formatting is pure and host-tested; the caller supplies every value.
 */
#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/event/event.h"
#include "ivts_core/fsm/state.h"
#include "ivts_core/model/telemetry.h"

/** Values shown in the periodic status lines. */
typedef struct {
    const ivts_telemetry_t *telemetry;   /**< Borrowed app snapshot. */
    ivts_fsm_state_t fsm;
    ivts_link_t      link;
    uint64_t uptime_ms;
    uint32_t queue_pending;              /**< Offline records awaiting replay. */
    uint32_t event_drops;                /**< App queue events dropped since boot. */
    uint32_t cmd_drops;                  /**< Cloud commands dropped by the modem FIFO. */
    uint32_t heap_free_bytes;
    uint32_t heap_min_bytes;
    uint64_t utc_unix_ms;                /**< RTC time, zero when unavailable. */
    bool rtc_trusted;
    bool publishing;                     /**< A QoS 1 publish awaits its PUBACK. */
    bool control_pending;                /**< Status, event, alarm, firmware or command ACK waits to be sent. */
    bool queue_unflushed;                /**< An offline record push has not reached the SD card yet. */
    bool ota_active;
    bool tracking_enabled;
} ivts_status_view_t;

/** One status line group. */
typedef enum {
    IVTS_STATUS_CORE = 0,
    IVTS_STATUS_NET,
    IVTS_STATUS_TIME,
    IVTS_STATUS_POWER,
    IVTS_STATUS_GNSS,
    IVTS_STATUS_OBD,
    IVTS_STATUS_SYS,
    IVTS_STATUS_COUNT
} ivts_status_group_t;

/**
 * @brief Format one status group as a NUL-terminated line without a newline.
 * @return Characters written excluding NUL; output is truncated to fit @p cap.
 */
size_t ivts_status_format(const ivts_status_view_t *view, ivts_status_group_t group, char *buf, size_t cap);

/** Upper-case names used by status and transition log lines. */
const char *ivts_ignition_name(ivts_ignition_t ignition);
const char *ivts_motion_name(ivts_motion_t motion);
const char *ivts_vehicle_name(ivts_vehicle_t vehicle);
const char *ivts_link_name(ivts_link_t link);
const char *ivts_ecu_name(ivts_ecu_state_t ecu);
const char *ivts_device_state_name(ivts_device_state_t device);
const char *ivts_sleep_mode_name(ivts_sleep_mode_t sleep);
