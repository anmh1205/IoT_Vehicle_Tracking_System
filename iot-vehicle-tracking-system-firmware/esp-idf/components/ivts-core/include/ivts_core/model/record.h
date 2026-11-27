/**
 * @file include/ivts_core/model/record.h
 * @brief Versioned binary telemetry records for the offline queue and replay.
 *
 * The app encodes and replays caller-owned telemetry snapshots. The codec
 * stores fields explicitly in little-endian order, independent of host byte
 * order or struct padding. The queue frame supplies the CRC and the app owns
 * ordering, publication and retries.
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
#define IVTS_RECORD_V2_SIZE  81u  /**< Encoded size of a version 2 record in bytes. */
#define IVTS_RECORD_MAX_SIZE IVTS_RECORD_V2_SIZE  /**< Byte capacity for the largest supported record. */

/** @brief Caller-owned telemetry sample with the identity used for replay. */
typedef struct {
    uint32_t          boot_id;     /**< Boot ID used with the sequence to preserve message identity across replay. */
    uint32_t          seq;         /**< Sequence allocated at capture and reused during replay. */
    ivts_gnss_t       gnss;  /**< GNSS observation and validity at capture. */
    ivts_obd_sample_t obd;  /**< OBD values and validity at capture. */
    uint16_t          vehicle_mv;  /**< Vehicle supply in millivolts at capture. */
    uint16_t          device_mv;  /**< Device supply in millivolts at capture. */
    uint8_t           ignition;    /**< ivts_ignition_t. */
    uint8_t           motion;      /**< ivts_motion_t. */
    uint8_t           vehicle;     /**< ivts_vehicle_t. */
    uint64_t          captured_unix_ms; /**< Trusted sample time in Unix milliseconds. Zero means unavailable. */
    uint32_t          uptime_ms;        /**< Monotonic sample time in milliseconds. */
    uint32_t          imu_delta_mmps2;  /**< Peak acceleration deviation in millimetres per second squared. */
    ivts_session_id_t session;  /**< Session identity at capture, with local_key zero when absent. */
    uint8_t           device;           /**< ivts_device_state_t. */
    uint8_t           sleep;            /**< ivts_sleep_mode_t. */
} ivts_record_t;

/**
 * @brief Encode a record in the current offline format.
 * @param r Required record borrowed for the call.
 * @param[out] buf Required destination. Written only on success.
 * @param cap Buffer capacity in bytes, at least IVTS_RECORD_V2_SIZE.
 * @param[out] out_len Optional byte count. Written only on success.
 * @retval IVTS_OK The version 2 record is encoded.
 * @retval IVTS_ERR_INVALID_ARG A required pointer is NULL or the capacity is too small.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_record_encode(const ivts_record_t *r, uint8_t *buf, size_t cap, size_t *out_len);

/**
 * @brief Decode a supported version of an offline record.
 *
 * Versions 1 and 2 are supported. Version 1 leaves later fields zero except captured_unix_ms,
 * which uses the GNSS timestamp when its fix is valid. Extra bytes are ignored.
 * The storage queue validates the CRC of the containing frame.
 *
 * @param buf Required encoded bytes borrowed for the call.
 * @param len Number of readable bytes in buf.
 * @param[out] r Required caller-owned result. Written only on success.
 * @retval IVTS_OK The record is decoded.
 * @retval IVTS_ERR_INVALID_ARG A required pointer is NULL or the record is short.
 * @retval IVTS_ERR_VERSION The version byte is unsupported.
 *
 * @note Context: Any task with valid caller-owned data. Blocking: non-blocking.
 */
ivts_err_t ivts_record_decode(const uint8_t *buf, size_t len, ivts_record_t *r);

/**
 * @brief Determine whether replay delivers a record before a boundary.
 *
 * A matching session boot ID and local key put its records before its close boundary.
 * Otherwise the comparison uses sequence within one boot and modular boot ID order across boots.
 *
 * @param r Required record borrowed for the call.
 * @param b Required boundary borrowed for the call.
 * @retval true The replay policy places the record before the boundary.
 * @retval false The replay policy places the boundary first.
 *
 * @note Context: App task. Blocking: non-blocking.
 */
bool ivts_record_precedes_boundary(const ivts_record_t *r, const ivts_session_boundary_t *b);
