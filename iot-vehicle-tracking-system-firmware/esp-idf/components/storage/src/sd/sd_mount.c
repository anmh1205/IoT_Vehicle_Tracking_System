/**
 * @file src/sd/sd_mount.c
 * @brief SDMMC wiring, card registration and FAT mount.
 *
 * Storage startup calls this adapter with the app-supplied pin configuration. Mount failure does not trigger
 * formatting.
 * The mount descriptor stays with this adapter. File ownership passes to the storage task after recovery.
 */
#include "sd/sd.h"
#include "storage_internal.h"
#include "driver/sdmmc_host.h"
#include "platform/log.h"
#include "esp_vfs_fat.h"
#include "sdmmc_cmd.h"

/* Startup receives the card descriptor from the mount call and uses it to report capacity. */
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
    /*
     * Enable the SoC's weak internal SDMMC pull-ups. The hardware normally
     * also needs external 10 kΩ pull-ups on CMD and D0 through D3.
     */
    slot.flags |= SDMMC_SLOT_FLAG_INTERNAL_PULLUP;

    esp_vfs_fat_sdmmc_mount_config_t mc = {
        .format_if_mount_failed = false,   /* Mount failure leaves the existing filesystem intact. */
        .max_files = 4,   /* Limit on simultaneously open FAT files. */
        .allocation_unit_size = 16 * 1024,   /* Allocation unit in bytes if formatting is enabled. */
    };
    esp_err_t e = esp_vfs_fat_sdmmc_mount(SD_MOUNT, &host, &slot, &mc, &s_card);
    if (e != ESP_OK) {
        IVTS_LOGW(STORAGE_TAG, "sd mount result=fail err=%s", esp_err_to_name(e));
        return e;
    }
    IVTS_LOGI(STORAGE_TAG, "sd mount result=ok card=%s size=%lluMB", s_card->cid.name,
              (unsigned long long)s_card->csd.capacity * (unsigned long long)s_card->csd.sector_size / (1024u * 1024u));
    storage_sd_log_open();
    return ESP_OK;
}
