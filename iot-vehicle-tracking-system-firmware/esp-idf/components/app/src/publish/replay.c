/**
 * @file replay.c
 * @brief Offline RAW replay and acknowledgement-driven queue advancement.
 *
 * The app retains the peek token until successful PUBACK for a valid RAW
 * record. Entries that fail payload decoding are discarded. A session
 * boundary waits behind its earlier RAW records.
 */
#include "publish/publish.h"
#include "app_internal.h"
#include "device/device.h"
#include "session/session_tracker.h"
#include "storage/storage.h"

static uint32_t s_replay_token;
static uint32_t s_popped_token;
static bool s_awaiting_peek;
static uint64_t s_peek_requested_at_ms;

static void request_peek_if_due(void)
{
    if (s_awaiting_peek && app_now() - s_peek_requested_at_ms < PEEK_RETRY_MS) { return; }
    if (storage_queue_request_peek() == IVTS_OK) {
        s_awaiting_peek = true;
        s_peek_requested_at_ms = app_now();
    }
}

static void pop_token(uint32_t token)
{
    if (storage_queue_pop(token) == IVTS_OK) { s_popped_token = token; }
}

app_replay_result_t app_replay_until(const ivts_session_boundary_t *boundary)
{
    bool writing = storage_queue_has_unflushed_push();
    if (storage_queue_count() == 0u) { return writing ? REPLAY_BUSY : REPLAY_EMPTY; }

    uint8_t frame[IVTS_RECORD_MAX_SIZE];
    size_t len = 0;
    uint32_t token = 0;
    if (storage_queue_peek_copy(frame, sizeof frame, &len, &token) != IVTS_OK) {
        request_peek_if_due();
        return REPLAY_BUSY;
    }
    s_awaiting_peek = false;
    /* A queued pop can leave the old token visible until the storage task processes it. */
    if (token == s_popped_token) { return REPLAY_BUSY; }

    ivts_record_t record;
    if (ivts_record_decode(frame, len, &record) != IVTS_OK) {
        pop_token(token);
        return REPLAY_BUSY;
    }
    if (boundary != NULL && !ivts_record_precedes_boundary(&record, boundary)) {
        return REPLAY_DONE_BEFORE_BOUNDARY;
    }
    if (app_messages_publish_replay_record(&record)) { s_replay_token = token; }
    return REPLAY_BUSY;
}

void app_replay_tick(void)
{
    if (!app_publisher_is_busy() && app_link_is_broker_up() && !app_session_has_unsent_boundary()) {
        (void)app_replay_until(NULL);
    }
}

void app_replay_on_ack(bool ok)
{
    if (ok) { pop_token(s_replay_token); }
}

void app_replay_on_queue_ready(void)
{
    s_awaiting_peek = false;
}
