/**
 * @file include/ivts_core/model/status.h
 * @brief Human-readable periodic status lines for the console UART.
 *
 * The app task logs one line per group from its telemetry snapshot and runtime
 * counters. The formatter borrows the snapshot and writes into caller-owned
 * storage. Clock reads, sampling and UART logging take place in the app.
 */
#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/event/event.h"
#include "ivts_core/fsm/state.h"
#include "ivts_core/model/telemetry.h"

/** @brief App-owned view of values borrowed for one status formatting call. */
typedef struct {
    const ivts_telemetry_t *telemetry;   /**< Borrowed app snapshot. */
    ivts_fsm_state_t fsm;  /**< Current app state machine state. */
    ivts_link_t      link;  /**< Current modem network and broker connection level. */
    uint64_t uptime_ms;  /**< Monotonic milliseconds since boot. */
    uint32_t queue_pending;              /**< Offline records awaiting replay. */
    uint32_t event_drops;                /**< App queue events dropped since boot. */
    uint32_t cmd_drops;                  /**< Cloud commands dropped by the modem FIFO. */
    uint32_t heap_free_bytes;  /**< Current free heap in bytes. */
    uint32_t heap_min_bytes;  /**< Minimum free heap in bytes since boot. */
    uint64_t utc_unix_ms;                /**< RTC time, zero when unavailable. */
    bool rtc_trusted;  /**< True when the app trusts the RTC time. */
    bool publishing;                     /**< A QoS 1 publish awaits its PUBACK. */
    bool control_pending;                /**< Control delivery or command handling is pending. */
    bool queue_unflushed;                /**< An offline record push has not reached the SD card yet. */
    bool ota_active;  /**< True while the app considers an OTA update in progress. */
    bool tracking_enabled;  /**< True when the app enables trip tracking. */
} ivts_status_view_t;

/** @brief Field group selected for a single console line. */
typedef enum {
    IVTS_STATUS_CORE = 0,  /**< Summarize FSM, device and vehicle state, link, queue and uptime. */
    IVTS_STATUS_NET,  /**< Show connectivity, pending delivery, OTA and tracking flags. */
    IVTS_STATUS_TIME,  /**< Show UTC time and RTC trust. */
    IVTS_STATUS_POWER,  /**< Show both supply voltages and the peak IMU deviation. */
    IVTS_STATUS_GNSS,  /**< Show fix validity and available position data. */
    IVTS_STATUS_OBD,  /**< Show BLE, ELM327 and ECU state and available PID readings. */
    IVTS_STATUS_SYS,  /**< Show heap and event and command drop counts. */
    IVTS_STATUS_COUNT  /**< Sentinel after the last status group. */
} ivts_status_group_t;

/**
 * @brief Format one status group as a line without a newline.
 *
 * @code
 * status fsm=DRIVING dev=ACTIVE ign=ON motion=MOVING vehicle=MOVING_ON link=BROKER_UP queue=0 up=00:12:34
 * status net link=BROKER_UP publishing=no control_pending=no queue=0 unflushed=no ota=no tracking=yes
 * status time utc=2026-11-27T08:01:12Z rtc=trusted
 * status power vehicle=13.52V device=4.05V imu_peak=0mmps2
 * status gnss fix=yes sats=9 pos=21.0285123,105.8542000 speed=36.0km/h course=182.5
 * status obd ble=up elm=ready ecu=LIVE rpm=1500 speed=36km/h coolant=89C fuel=54% load=22%
 * status sys heap=142kB heap_min=118kB event_drops=0 cmd_drops=0
 * @endcode
 *
 * @param view Borrowed view. A NULL view or a NULL telemetry pointer yields an empty line.
 * @param group Status group to format. The sentinel and unknown groups yield an empty line.
 * @param[out] buf Caller-owned line buffer. A non-NULL buffer with positive capacity is NUL-terminated.
 * @param cap Capacity in bytes including NUL. If zero, buf is left untouched.
 * @return Bytes written excluding NUL, with truncation to fit cap. Zero for a NULL buffer or empty output.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
size_t ivts_status_format(const ivts_status_view_t *view, ivts_status_group_t group, char *buf, size_t cap);

/**
 * @brief Return the upper-case console name of the ignition state.
 * @param ignition Value to name.
 * @return Immutable static string, or "UNKNOWN" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_ignition_name(ivts_ignition_t ignition);
/**
 * @brief Return the upper-case console name of the motion state.
 * @param motion Value to name.
 * @return Immutable static string, or "UNKNOWN" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_motion_name(ivts_motion_t motion);
/**
 * @brief Return the upper-case console name of the vehicle state.
 * @param vehicle Value to name.
 * @return Immutable static string, or "UNKNOWN" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_vehicle_name(ivts_vehicle_t vehicle);
/**
 * @brief Return the upper-case console name of the link state.
 * @param link Value to name.
 * @return Immutable static string, or "DOWN" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_link_name(ivts_link_t link);
/**
 * @brief Return the upper-case console name of the ECU state.
 * @param ecu Value to name.
 * @return Immutable static string, or "UNKNOWN" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_ecu_name(ivts_ecu_state_t ecu);
/**
 * @brief Return the upper-case console name of the device state.
 * @param device Value to name.
 * @return Immutable static string, or "UNKNOWN" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_device_state_name(ivts_device_state_t device);
/**
 * @brief Return the upper-case console name of the sleep mode.
 * @param sleep Value to name.
 * @return Immutable static string, or "UNKNOWN" for an unrecognized value.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
const char *ivts_sleep_mode_name(ivts_sleep_mode_t sleep);
