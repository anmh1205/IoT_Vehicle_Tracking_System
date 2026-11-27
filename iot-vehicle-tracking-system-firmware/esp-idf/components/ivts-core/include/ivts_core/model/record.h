/**
 * @file record.h
 * @brief Versioned binary telemetry records for the offline queue and replay.
 *
 * Encode the version byte and fields explicitly in little-endian order.
 * Compiler padding and host endianness do not enter the storage format. The
 * containing queue frame adds the CRC.
 */
#pragma once

#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/gnss.h"
#include "ivts_core/model/obd.h"
#include "ivts_core/model/session.h"

#define IVTS_RECORD_VERSION  2u    /**< Version emitted by the current encoder. */
#define IVTS_RECORD_V1_SIZE  47u   /**< Encoded size of a version 1 record in bytes. */
#define IVTS_RECORD_V2_SIZE  81u
#define IVTS_RECORD_MAX_SIZE IVTS_RECORD_V2_SIZE

/** One telemetry sample for serialization or delivery. */
typedef struct {
    uint32_t          boot_id;     /**< Boot ID used with the sequence to preserve message identity across replay. */
    uint32_t          seq;         /**< Sequence allocated at capture and reused during replay. */
    ivts_gnss_t       gnss;
    ivts_obd_sample_t obd;
    uint16_t          vehicle_mv;
    uint16_t          device_mv;
    uint8_t           ignition;    /**< ivts_ignition_t. */
    uint8_t           motion;      /**< ivts_motion_t. */
    uint8_t           vehicle;     /**< ivts_vehicle_t. */
    uint64_t          captured_unix_ms; /**< Trusted sample time in Unix milliseconds. Zero means unavailable. */
    uint32_t          uptime_ms;        /**< Monotonic sample time in milliseconds. */
    uint32_t          imu_delta_mmps2;
    ivts_session_id_t session;
    uint8_t           device;           /**< ivts_device_state_t. */
    uint8_t           sleep;            /**< ivts_sleep_mode_t. */
} ivts_record_t;

/**
 * @brief Encode a record in the current wire format.
 * @param r Source record.
 * @param[out] buf Destination buffer.
 * @param cap Capacity of buf, at least IVTS_RECORD_V2_SIZE bytes.
 * @param[out] out_len Optional byte count written.
 * @return IVTS_OK, or IVTS_ERR_INVALID_ARG for an invalid argument or
 * capacity.
 */
ivts_err_t ivts_record_encode(const ivts_record_t *r, uint8_t *buf, size_t cap, size_t *out_len);

/**
 * @brief Decode a supported version of an offline record.
 * @param buf Encoded record bytes.
 * @param len Number of bytes in buf.
 * @param[out] r Decoded record.
 * @return IVTS_OK on success, IVTS_ERR_INVALID_ARG for invalid arguments or a
 * short record, or IVTS_ERR_VERSION for an unsupported format.
 * @note The storage queue validates the CRC of the containing frame.
 */
ivts_err_t ivts_record_decode(const uint8_t *buf, size_t len, ivts_record_t *r);

/**
 * Compare a sample against a session boundary for replay. A sample from the
 * closing session precedes its close boundary.
 */
bool ivts_record_precedes_boundary(const ivts_record_t *r, const ivts_session_boundary_t *b);
