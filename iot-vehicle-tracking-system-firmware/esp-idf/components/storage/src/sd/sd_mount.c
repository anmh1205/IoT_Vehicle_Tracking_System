#include "sd_io.h"
#include "storage_internal.h"
#include "driver/sdmmc_host.h"
#include "esp_log.h"
#include "esp_vfs_fat.h"
#include "sdmmc_cmd.h"

static sdmmc_card_t *s_card;

esp_err_t storage_sd_mount(void)
{
    const storage_cfg_t *c = storage_config_view();
    sdmmc_host_t host = SDMMC_HOST_DEFAULT();
    sdmmc_slot_config_t slot = SDMMC_SLOT_CONFIG_DEFAULT();
    slot.width = 4;
    slot.clk = (gpio_num_t)c->pin_clk;
    slot.cmd = (gpio_num_t)c->pin_cmd;
    slot.d0 = (gpio_num_t)c->pin_d0;
    slot.d1 = (gpio_num_t)c->pin_d1;
    slot.d2 = (gpio_num_t)c->pin_d2;
    slot.d3 = (gpio_num_t)c->pin_d3;
    slot.cd = (c->pin_cd >= 0) ? (gpio_num_t)c->pin_cd : SDMMC_SLOT_NO_CD;
    /* Bật pull-up nội của SoC cho các chân SDMMC. Pull-up nội yếu; ESP-IDF khuyến nghị pull-up
     * ngoài 10 kΩ trên CMD và D0..D3 để chạy ổn định. */
    slot.flags |= SDMMC_SLOT_FLAG_INTERNAL_PULLUP;

    esp_vfs_fat_sdmmc_mount_config_t mc = {
        .format_if_mount_failed = false,   /* Không tự định dạng khi gắn lỗi. */
        .max_files = 4,
        .allocation_unit_size = 16 * 1024,
    };
    esp_err_t e = esp_vfs_fat_sdmmc_mount(SD_MOUNT, &host, &slot, &mc, &s_card);
    if (e != ESP_OK) {
        ESP_LOGW(STORAGE_TAG, "mount SD: %s", esp_err_to_name(e));
        return e;
    }
    storage_sd_log_open();
    return ESP_OK;
}
