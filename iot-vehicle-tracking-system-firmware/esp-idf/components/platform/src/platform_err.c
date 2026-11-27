#include "platform/platform_err.h"

ivts_err_t platform_err_from_esp(esp_err_t error)
{
    switch (error) {
    case ESP_OK:                return IVTS_OK;
    case ESP_ERR_INVALID_ARG:   return IVTS_ERR_INVALID_ARG;
    case ESP_ERR_INVALID_STATE: return IVTS_ERR_INVALID_STATE;
    case ESP_ERR_TIMEOUT:       return IVTS_ERR_TIMEOUT;
    case ESP_ERR_NOT_FOUND:     return IVTS_ERR_NOT_FOUND;
    case ESP_ERR_NO_MEM:        return IVTS_ERR_FULL;
    default:                    return IVTS_ERR_IO;
    }
}
