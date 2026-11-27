/**
 * @file include/ivts_core/model/session.h
 * @brief Trip session records and open or close boundary messages.
 *
 * The app task owns the active session and edits its outbox. A session retains
 * the boot ID and local key of its start, while each boundary has its own message
 * identity. The app persists the state as one NVS record and removes boundaries
 * in order after broker PUBACK. The MQTT Bridge assigns canonical IDs.
 */
#pragma once

#include <stdint.h>

/** @brief Session identity copied by value into records and boundaries. */
typedef struct {
    uint64_t canonical_id;  /**< Bridge-assigned numeric ID, or zero until assigned. */
    uint32_t boot_id;  /**< Boot identifier of the session start. */
    uint32_t local_key;           /**< Zero when no session is active. */
} ivts_session_id_t;

/** @brief Boundary kind used in the durable outbox and status payload. */
typedef enum {
    IVTS_BOUNDARY_NONE = 0,  /**< Status carries no session transition. */
    IVTS_BOUNDARY_STARTED,  /**< The app opens a local tracking session. */
    IVTS_BOUNDARY_ENDED,  /**< The app closes a local tracking session. */
} ivts_boundary_kind_t;

/** @brief App-owned boundary snapshot retained for replay until PUBACK. */
typedef struct {
    ivts_session_id_t session;  /**< Session identity carried by this boundary. */
    uint64_t unix_ms;              /**< Zero when trusted UTC time is unavailable. */
    uint32_t uptime_ms;  /**< Boundary capture time in monotonic milliseconds during the emitting boot. */
    uint32_t boot_id;              /**< Boot ID of the emitted message, which may differ from the session's start. */
    uint32_t seq;  /**< Boundary message sequence retained across retry. */
    uint8_t kind;                 /**< ivts_boundary_kind_t. */
} ivts_session_boundary_t;

#define IVTS_SESSION_OUTBOX_SIZE 8u  /**< Maximum pending session boundaries. */
#define IVTS_SESSION_MAX_CANONICAL_ID UINT64_C(9007199254740991)  /**< Largest accepted canonical ID. */

/** @brief App-task-owned session state. The active session and pending boundaries share one NVS blob. */
typedef struct {
    ivts_session_id_t active;  /**< Current local session, with local_key zero when inactive. */
    ivts_session_boundary_t outbox[IVTS_SESSION_OUTBOX_SIZE];  /**< Pending boundaries, oldest first. */
    uint8_t count;  /**< Number of occupied outbox entries, zero through IVTS_SESSION_OUTBOX_SIZE. */
} ivts_session_state_t;
