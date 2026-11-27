/**
 * @file src/queue/queue.h
 * @brief Private offline queue state, frame codec and peek-slot contracts.
 *
 * Startup recovers the cursor and segments. The storage task owns subsequent disk mutations.
 * The slot mutex protects a shared copy and count, separately from file I/O. The app uses the public copy
 * API.
 * The frame codec can run independently of storage. Record schema and delivery policy live with its callers.
 */
#pragma once
#include "esp_err.h"
#include "storage/offline_queue.h"
#include <stddef.h>
#include <stdint.h>
#include "ivts_core/model/record.h"
#include <stdio.h>
#include "storage_internal.h"

/**
 * @brief Allocate the mutex for shared queue count and peek data.
 * Check storage_queue_slot_is_initialized() for the result.
 * @note Context: App startup before recovery. Allocates a mutex with no explicit wait.
 */
void storage_queue_slot_init(void);
/**
 * @brief Recover and open the component-owned offline queue.
 * @retval ESP_OK The queue is ready.
 * @retval ESP_ERR_INVALID_ARG Queue configuration or the slot mutex is invalid.
 * @retval ESP_FAIL Directory, recovery or scan I/O fails.
 * @note Context: App startup. Synchronous SD I/O with no fixed timeout.
 */
esp_err_t storage_queue_open(void);
/**
 * @brief Append a record to the component-owned queue.
 * @param record Borrowed encoded record of len bytes.
 * @param len Byte count, from one through IVTS_RECORD_MAX_SIZE.
 * @retval IVTS_OK The frame is appended and the count is updated.
 * @retval IVTS_ERR_INVALID_STATE The queue is closed.
 * @retval IVTS_ERR_INVALID_ARG The length is invalid.
 * @retval IVTS_ERR_FULL The tail cannot rotate past the maximum segment ID.
 * @retval IVTS_ERR_IO Tail repair, reclamation or append fails.
 * @note Context: Storage task. Synchronous SD I/O and slot locking with no fixed timeout.
 */
ivts_err_t storage_queue_do_push(const uint8_t *record, size_t len);
/**
 * @brief Fill the component-owned peek slot and announce a new record.
 * @retval IVTS_OK A record is cached or there is nothing to fill.
 * @retval IVTS_ERR_INVALID_STATE The queue is closed.
 * @retval IVTS_ERR_IO Segment read or advance fails.
 * @note Context: Storage task. Synchronous SD I/O and slot locking with no fixed timeout.
 */
ivts_err_t storage_queue_do_peek(void);
/**
 * @brief Apply a matching pop to the component-owned queue.
 * @param token Peek token from the app.
 * @retval IVTS_OK The slot is consumed and the cursor advances in RAM.
 * @retval IVTS_ERR_INVALID_ARG The slot mutex is absent.
 * @retval IVTS_ERR_INVALID_STATE The queue is closed.
 * @retval IVTS_ERR_NOT_FOUND The token is stale or the slot is empty.
 * @note Context: Storage task. May lock the slot and checkpoint on SD with no fixed timeout.
 */
ivts_err_t storage_queue_do_pop(uint32_t token);

#define FRAME_OVERHEAD 6u   /**< Six frame bytes for magic, length and CRC32. */

/** @brief End and error results from reading or validating a frame. */
enum { FRAME_END = 0, /**< EOF. */ FRAME_CORRUPT = -1, /**< Corrupt frame. */ FRAME_IO = -2 /**< I/O error. */ };

/* The frame is A5, payload length, payload, then little-endian CRC32.
 * The checksum covers the length byte and payload.
 */
/**
 * @brief Validate the magic and length of a frame header.
 * @param header Borrowed two bytes containing magic and length.
 * @return Payload size in bytes, or zero for an invalid header.
 * @note Context: Task or host context. Non-blocking.
 */
size_t storage_queue_frame_payload_size(const uint8_t header[2]);
/**
 * @brief Encode a record with the queue magic, length and little-endian CRC32.
 * @param[out] frame Writable buffer of at least len plus FRAME_OVERHEAD bytes.
 * @param record Borrowed payload in a buffer separate from frame.
 * @param len Valid payload length from one through IVTS_RECORD_MAX_SIZE bytes.
 * @return Encoded frame length in bytes. CRC covers the length and payload.
 * @note Context: Task or host context. Non-blocking.
 */
size_t storage_queue_frame_encode(uint8_t *frame, const uint8_t *record, size_t len);
/**
 * @brief Verify a complete frame and optionally copy the payload.
 * @param frame Borrowed frame bytes.
 * @param size Exact frame length in bytes.
 * @param[out] payload Optional buffer with room for the payload. Unchanged on failure.
 * @param[out] len Required when payload is non-null. Receives the payload byte count only on a successful
 *       copy.
 * @return Frame length in bytes on success or FRAME_CORRUPT for invalid length, magic or CRC.
 * @note Context: Task or host context. Non-blocking.
 */
int storage_queue_frame_decode(const uint8_t *frame, size_t size, uint8_t *payload, size_t *len);

#define Q_DIR SD_MOUNT "/q"   /**< Directory for offline queue segments and cursor checkpoints. */
#define MAX_SEGMENT_ID 9999999u   /**< Highest ID representable in the seven-digit segment filename. */

/** @brief Segment and cursor state owned by startup during recovery and by the storage task afterward. */
typedef struct {
    uint32_t head;   /**< Lowest segment ID tracked by the queue. */
    uint32_t tail;   /**< Segment ID used for appends. */
    uint32_t tail_size;   /**< Known complete frame bytes in the tail. */
    uint32_t read_segment;   /**< Segment ID at the read cursor. */
    uint32_t read_offset;   /**< Byte offset of the next unread frame. */
    uint32_t checkpoint_sequence;   /**< Last loaded or synced slot sequence, zero for initial or legacy recovery. */
    uint32_t pops_since_checkpoint;   /**< Accepted pops since a checkpoint was synced and closed successfully. */
    bool is_open;   /**< Recovery completes and file operations can proceed. */
    bool tail_needs_repair;   /**< An incomplete append needs truncation before another write. */
} storage_queue_state_t;

/**
 * @brief Recover the queue by scanning segments, repairing the tail and restoring the cursor.
 * @param[in,out] queue Non-null state to initialize. Its open flag remains false on failure.
 * @retval ESP_OK Recovery completes and the shared unread count is published.
 * @retval ESP_ERR_INVALID_ARG The slot mutex or configured limits are invalid.
 * @retval ESP_FAIL Directory creation, listing, tail repair or counting fails.
 * @note Context: App startup before SD requests. Synchronous SD I/O and slot locking with no fixed timeout.
 */
esp_err_t storage_queue_open_state(storage_queue_state_t *queue);
/**
 * @brief Append one record and count it after a full write and successful close.
 * @param[in,out] queue Borrowed queue state.
 * @param record Borrowed encoded bytes.
 * @param len Byte count, from one through IVTS_RECORD_MAX_SIZE.
 * @retval IVTS_OK The frame is appended.
 * @retval IVTS_ERR_INVALID_STATE The queue is closed.
 * @retval IVTS_ERR_INVALID_ARG The length is invalid.
 * @retval IVTS_ERR_FULL The segment ID limit prevents rotation.
 * @retval IVTS_ERR_IO Repair, reclamation or append fails.
 * @note Context: Storage task. Synchronous SD I/O and slot locking with no fixed timeout.
 */
ivts_err_t storage_queue_push_record(storage_queue_state_t *queue, const uint8_t *record, size_t len);
/**
 * @brief Read the next frame and publish a newly filled slot.
 * @param[in,out] queue Borrowed state. May advance past exhausted, missing or corrupt older segments.
 * @retval IVTS_OK A frame is cached, the slot is occupied or there is nothing readable.
 * @retval IVTS_ERR_INVALID_STATE The queue is closed.
 * @retval IVTS_ERR_IO File I/O or segment advance fails.
 * @note Context: Storage task. Synchronous SD I/O and slot locking with no fixed timeout.
 */
ivts_err_t storage_queue_peek_record(storage_queue_state_t *queue);
/**
 * @brief Consume the slot and advance the cursor on a matching token.
 * @param[in,out] queue Borrowed state. Cursor fields are unchanged on a token mismatch.
 * @param token Peek token to match.
 * @retval IVTS_OK A matching slot is consumed. A checkpoint is attempted after at least 16 pops
 *       since the last save or when the unread count reaches zero.
 * @retval IVTS_ERR_INVALID_ARG The slot mutex is absent.
 * @retval IVTS_ERR_INVALID_STATE The queue is closed.
 * @retval IVTS_ERR_NOT_FOUND No matching slot.
 * @note Context: Storage task. May lock the slot and write a checkpoint with no fixed timeout.
 */
ivts_err_t storage_queue_pop_record(storage_queue_state_t *queue, uint32_t token);

/**
 * @brief Format the path for a numbered segment.
 * @param[out] out Borrowed writable destination, truncated if too small.
 * @param len Destination capacity in bytes, including NUL. Use a positive capacity.
 * @param segment Segment ID from zero through MAX_SEGMENT_ID.
 * @note Context: Startup or storage task. Non-blocking.
 */
void storage_queue_segment_path(char *out, size_t len, uint32_t segment);
/**
 * @brief Parse a seven-digit segment ID from a queue filename.
 * @param name Borrowed NUL-terminated basename.
 * @param[out] id Parsed ID on success. Unchanged on failure.
 * @retval true The basename matches the segment format.
 * @retval false The basename does not match.
 * @note Context: Startup or storage task. Non-blocking.
 */
bool storage_queue_segment_id(const char *name, uint32_t *id);
/**
 * @brief Find the lowest listed ID at or above the requested position and below the tail.
 * @param queue Borrowed state containing the current tail ID.
 * @param first Inclusive lower segment ID.
 * @param[out] next Resulting ID. Defaults to the tail and may contain a partial result on failure.
 * @retval true Directory enumeration completes.
 * @retval false The directory cannot be opened or read.
 * @note Context: Startup during recovery or storage task afterward. Synchronous SD I/O with no fixed timeout.
 */
bool storage_queue_next_segment(const storage_queue_state_t *queue, uint32_t first, uint32_t *next);
/**
 * @brief Find the lowest and highest recognized segment IDs.
 * @param[out] head Lowest segment ID, or zero when none exist.
 * @param[out] tail Highest segment ID, or zero when none exist.
 * @retval true Directory enumeration completes.
 * @retval false The directory cannot be opened or read. Outputs may contain partial results.
 * @note Context: Startup during recovery or storage task afterward. Synchronous SD I/O with no fixed timeout.
 */
bool storage_queue_find_segment_range(uint32_t *head, uint32_t *tail);
/**
 * @brief Seek to a byte offset and validate a frame from an open segment.
 * @param file Borrowed readable file handle. Its position changes during the call.
 * @param offset Frame start offset in bytes.
 * @param[out] payload Optional buffer of IVTS_RECORD_MAX_SIZE bytes. Written only for a valid frame.
 * @param[out] len Required when payload is non-null. Receives the payload byte count only on a successful
 *       copy.
 * @return Positive frame byte count, FRAME_END, FRAME_CORRUPT or FRAME_IO.
 * @note Context: Startup during recovery or storage task afterward. Synchronous SD I/O with no fixed timeout.
 */
int storage_queue_read_frame(FILE *file, uint32_t offset, uint8_t *payload, size_t *len);
/**
 * @brief Count valid contiguous frames from the specified offset.
 * @param segment Numbered segment to scan.
 * @param offset Starting byte offset.
 * @param[out] valid_end Byte offset immediately after the valid prefix, or offset if no frame validates.
 * @param[out] count Number of valid frames found, including on an error after a valid prefix.
 * @return FRAME_END for EOF or a missing file, FRAME_CORRUPT for an invalid frame, or FRAME_IO for an I/O
 *       failure.
 * @note Context: Startup during recovery or storage task afterward. Synchronous SD I/O with no fixed timeout.
 */
int storage_queue_scan_segment(uint32_t segment, uint32_t offset, uint32_t *valid_end, uint32_t *count);

/**
 * @brief Write and sync the current position to the inactive checkpoint file.
 * @param[in,out] queue Borrowed state. Sync advances the sequence. Successful sync and close clear the pop count.
 * @note Context: Storage task. Synchronous SD I/O with no fixed timeout. Failures are not returned.
 */
void storage_queue_cursor_save(storage_queue_state_t *queue);
/**
 * @brief Load the newest checksum-valid slot, falling back to the legacy cursor if both slots are absent or invalid.
 * @param[in,out] queue Borrowed state. Read segment and offset change only on success.
 * @retval ESP_OK A cursor was loaded. Recovery separately checks the segment range.
 * @retval ESP_ERR_NOT_FOUND No complete, valid cursor is available.
 * @retval ESP_FAIL A cursor file could not be read due to I/O failure.
 * @note Context: App startup. Synchronous SD I/O with no fixed timeout.
 */
esp_err_t storage_queue_cursor_load(storage_queue_state_t *queue);

/**
 * @brief Check availability of the shared slot mutex.
 * @retval true The mutex exists.
 * @retval false The mutex is absent.
 * @note Context: App startup or runtime task. Non-blocking. The mutex handle is fixed after startup.
 */
bool storage_queue_slot_is_initialized(void);
/**
 * @brief Reconcile the unread count without clearing the current peek.
 * @param count New unread record count.
 * @note Context: Storage task. Waits on the slot mutex without a fixed timeout.
 */
void storage_queue_slot_set_count(uint32_t count);
/**
 * @brief Clear the peek and publish the recovered unread count.
 * @param count Unread record count from the startup scan.
 * @note Context: App startup. Waits on the slot mutex without a fixed timeout.
 */
void storage_queue_slot_reset(uint32_t count);
/**
 * @brief Adjust shared slot state after old segment removal.
 * @param segment Removed segment ID. A slot whose next cursor names this segment is cleared.
 * @param lost Number of lost records subtracted from the count, floored at zero.
 * @note Context: Storage task. Waits on the slot mutex without a fixed timeout.
 */
void storage_queue_slot_evict(uint32_t segment, uint32_t lost);
/**
 * @brief Increment the shared unread count after successful append.
 * @note Context: Storage task. Waits on the slot mutex without a fixed timeout.
 */
void storage_queue_slot_note_push(void);
/**
 * @brief Check for unread records and an empty cache.
 * @param[out] count Non-null destination for the unread count, written for either outcome.
 * @retval true The slot is empty and the unread count is positive.
 * @retval false The slot is full or no unread records are counted.
 * @note Context: Storage task. Waits on the slot mutex without a fixed timeout.
 */
bool storage_queue_slot_can_peek(uint32_t *count);
/**
 * @brief Copy a record into the peek slot and assign a nonzero token.
 * @param data Borrowed encoded bytes.
 * @param len Payload byte count, from one through IVTS_RECORD_MAX_SIZE.
 * @param next_segment Segment ID to use after a matching pop.
 * @param next_offset Byte offset to use after a matching pop.
 * @note Context: Storage task. Waits on the slot mutex without a fixed timeout.
 */
void storage_queue_slot_fill(const uint8_t *data, size_t len, uint32_t next_segment, uint32_t next_offset);
/**
 * @brief Consume the cached record if the requested token matches.
 * @param token Peek token to compare.
 * @param[out] segment Non-null destination for the next cursor's segment ID.
 * @param[out] offset Non-null destination for the next cursor's byte offset.
 * @retval true The outputs are written, the slot is cleared and the pending count decreases if positive.
 * @retval false No match. Slot, count and outputs stay unchanged.
 * @note Context: Storage task after the caller checks that the queue and slot mutex are ready.
 *       Waits on the slot mutex without a fixed timeout.
 */
bool storage_queue_slot_consume(uint32_t token, uint32_t *segment, uint32_t *offset);
