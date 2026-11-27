#pragma once

#include <stdint.h>

typedef struct {
    uint64_t canonical_id;
    uint32_t boot_id;
    uint32_t local_key;           /**< 0 khi chưa có phiên. */
} ivts_session_id_t;

typedef enum {
    IVTS_BOUNDARY_NONE = 0,
    IVTS_BOUNDARY_STARTED,
    IVTS_BOUNDARY_ENDED,
} ivts_boundary_kind_t;

typedef struct {
    ivts_session_id_t session;
    uint64_t unix_ms;              /**< 0 nếu chưa có giờ tin cậy. */
    uint32_t uptime_ms;
    uint32_t boot_id;              /**< Boot phát sinh bản tin, có thể khác boot mở phiên. */
    uint32_t seq;
    uint8_t kind;                 /**< ivts_boundary_kind_t. */
} ivts_session_boundary_t;

#define IVTS_SESSION_OUTBOX_SIZE 8u
#define IVTS_SESSION_MAX_CANONICAL_ID UINT64_C(9007199254740991)

/** Phiên đang mở và hàng đợi mốc chưa có PUBACK được ghi cùng một blob NVS. */
typedef struct {
    ivts_session_id_t active;
    ivts_session_boundary_t outbox[IVTS_SESSION_OUTBOX_SIZE];
    uint8_t count;
} ivts_session_state_t;
