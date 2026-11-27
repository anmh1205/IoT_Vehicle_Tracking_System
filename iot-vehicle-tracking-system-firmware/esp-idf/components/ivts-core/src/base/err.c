#include "ivts_core/base/err.h"

const char *ivts_err_name(ivts_err_t e)
{
    /* Không dùng default: để -Wswitch báo lỗi khi thêm giá trị enum mà chưa thêm tên. */
    switch (e) {
    case IVTS_OK:                 return "IVTS_OK";
    case IVTS_ERR_FAIL:           return "IVTS_ERR_FAIL";
    case IVTS_ERR_INVALID_ARG:    return "IVTS_ERR_INVALID_ARG";
    case IVTS_ERR_INVALID_STATE:  return "IVTS_ERR_INVALID_STATE";
    case IVTS_ERR_TIMEOUT:        return "IVTS_ERR_TIMEOUT";
    case IVTS_ERR_NOT_FOUND:      return "IVTS_ERR_NOT_FOUND";
    case IVTS_ERR_FULL:           return "IVTS_ERR_FULL";
    case IVTS_ERR_IO:             return "IVTS_ERR_IO";
    case IVTS_ERR_CRC:            return "IVTS_ERR_CRC";
    case IVTS_ERR_VERSION:        return "IVTS_ERR_VERSION";
    case IVTS_ERR_COUNT:          break;
    }
    return "IVTS_ERR_UNKNOWN";
}
