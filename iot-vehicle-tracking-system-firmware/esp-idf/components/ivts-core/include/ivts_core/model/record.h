#pragma once

/**
 * @file record.h
 * @brief Bản ghi telemetry của offline queue và định dạng lưu trữ của nó.
 *
 * Bản ghi được mã hoá từng byte, little-endian, có byte version ở đầu. Không dùng
 * memcpy trên struct: padding và endianness không thuộc về hợp đồng định dạng.
 * CRC không nằm trong bản ghi mà do khung của storage_queue thêm vào.
 */

#include <stddef.h>
#include <stdint.h>
#include "ivts_core/base/err.h"
#include "ivts_core/model/gnss.h"
#include "ivts_core/model/obd.h"
#include "ivts_core/model/session.h"

#define IVTS_RECORD_VERSION  2u    /**< Version của định dạng ghi mới. */
#define IVTS_RECORD_V1_SIZE  47u   /**< Kích thước bản ghi version 1 (byte). */
#define IVTS_RECORD_V2_SIZE  81u
#define IVTS_RECORD_MAX_SIZE IVTS_RECORD_V2_SIZE

/** Một mẫu telemetry được lưu hoặc gửi. */
typedef struct {
    uint32_t          boot_id;     /**< Cùng seq tạo message_id; ổn định qua reset. */
    uint32_t          seq;         /**< Số thứ tự cấp lúc chụp mẫu; replay dùng lại đúng giá trị. */
    ivts_gnss_t       gnss;
    ivts_obd_sample_t obd;
    uint16_t          vehicle_mv;
    uint16_t          device_mv;
    uint8_t           ignition;    /**< ivts_ignition_t. */
    uint8_t           motion;      /**< ivts_motion_t. */
    uint8_t           vehicle;     /**< ivts_vehicle_t. */
    uint64_t          captured_unix_ms; /**< Giờ lấy mẫu tin cậy, 0 nếu chưa có. */
    uint32_t          uptime_ms;        /**< Uptime lúc lấy mẫu. */
    uint32_t          imu_delta_mmps2;
    ivts_session_id_t session;
    uint8_t           device;           /**< ivts_device_state_t. */
    uint8_t           sleep;            /**< ivts_sleep_mode_t. */
} ivts_record_t;

/**
 * @brief Mã hoá bản ghi theo định dạng version hiện tại.
 * @param r        Bản ghi nguồn.
 * @param buf      Buffer đích.
 * @param cap      Kích thước @p buf, tối thiểu IVTS_RECORD_V2_SIZE.
 * @param out_len  Nhận số byte đã ghi; có thể NULL.
 * @return IVTS_OK; IVTS_ERR_INVALID_ARG nếu tham số sai hoặc buffer nhỏ.
 */
ivts_err_t ivts_record_encode(const ivts_record_t *r, uint8_t *buf, size_t cap, size_t *out_len);

/**
 * @brief Giải mã bản ghi.
 * @param buf  Dữ liệu đã mã hoá.
 * @param len  Số byte của @p buf.
 * @param r    Nhận bản ghi.
 * @return IVTS_OK; IVTS_ERR_INVALID_ARG nếu con trỏ NULL hoặc dữ liệu ngắn hơn định dạng;
 *         IVTS_ERR_VERSION nếu version không được hỗ trợ.
 * @note Hàm không kiểm tra CRC; việc đó thuộc về khung lưu trữ của storage_queue.
 */
ivts_err_t ivts_record_decode(const uint8_t *buf, size_t len, ivts_record_t *r);

/** So thứ tự replay của mẫu và mốc phiên. Mẫu thuộc phiên đang đóng phải đi trước mốc đóng. */
bool ivts_record_precedes_boundary(const ivts_record_t *r, const ivts_session_boundary_t *b);
