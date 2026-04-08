#include "sd_log_store.h"

#include <errno.h>
#include <inttypes.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

#include "driver/gpio.h"
#include "driver/sdmmc_host.h"
#include "esp_log.h"
#include "esp_vfs_fat.h"
#include "sdkconfig.h"
#include "sdmmc_cmd.h"

#include "pin_map.h"
#include "telemetry_counters.h"
#include "util.h"

#define SD_LOG_MOUNT_POINT "/sdcard"
#define SD_LOG_ROOT_DIR SD_LOG_MOUNT_POINT "/tracker"
#define SD_LOG_META_DIR SD_LOG_ROOT_DIR "/meta"
#define SD_LOG_LOG_DIR SD_LOG_ROOT_DIR "/logs"
#define SD_LOG_META_PATH SD_LOG_META_DIR "/queue.dat"
#define SD_LOG_META_TMP_PATH SD_LOG_META_DIR "/queue.tmp"
#define SD_LOG_META_BAK_PATH SD_LOG_META_DIR "/queue.bak"
#define SD_LOG_DATA_PATH SD_LOG_LOG_DIR "/queue.log"
#define SD_LOG_DATA_TMP_PATH SD_LOG_LOG_DIR "/queue.tmp"
#define SD_LOG_DATA_BAK_PATH SD_LOG_LOG_DIR "/queue.bak"
#define SD_LOG_LINE_MAX 640

static const char *TAG = "SD_LOG_STORE";

typedef enum {
    SD_LOG_STATE_UNAVAILABLE = 0,
    SD_LOG_STATE_MOUNTED,
    SD_LOG_STATE_DEGRADED,
} sd_log_state_t;

typedef struct {
    bool initialized;
    bool mounted;
    bool cd_configured;
    sd_log_state_t state;
    sdmmc_card_t *card;
    sd_log_meta_t meta;
} sd_log_store_ctx_t;

static sd_log_store_ctx_t s_ctx;

static void sd_log_store_set_state(sd_log_state_t state) {
    s_ctx.state = state;
    s_ctx.mounted = state == SD_LOG_STATE_MOUNTED;
}

static void sd_log_store_mark_degraded(void) {
    if (s_ctx.state == SD_LOG_STATE_MOUNTED) {
        s_ctx.state = SD_LOG_STATE_DEGRADED;
    }
}

static esp_err_t sd_log_store_write_meta_snapshot(const sd_log_meta_t *meta) {
    ESP_RETURN_ON_NULL(meta, ESP_ERR_INVALID_ARG, TAG, "meta null");

    FILE *fp = fopen(SD_LOG_META_TMP_PATH, "wb");
    if (fp == NULL) {
        ESP_LOGE(TAG,
                 "open meta tmp for write failed path=%s errno=%d (%s)",
                 SD_LOG_META_TMP_PATH,
                 errno,
                 strerror(errno));
        telemetry_counters_inc_sd_write_fail();
        sd_log_store_mark_degraded();
        return ESP_FAIL;
    }

    size_t write_len = fwrite(meta, 1, sizeof(*meta), fp);
    if (write_len != sizeof(*meta)) {
        fclose(fp);
        remove(SD_LOG_META_TMP_PATH);
        telemetry_counters_inc_sd_write_fail();
        sd_log_store_mark_degraded();
        return ESP_FAIL;
    }

    fflush(fp);
    if (fsync(fileno(fp)) != 0) {
        fclose(fp);
        remove(SD_LOG_META_TMP_PATH);
        telemetry_counters_inc_sd_fsync_fail();
        sd_log_store_mark_degraded();
        return ESP_FAIL;
    }

    fclose(fp);

    remove(SD_LOG_META_BAK_PATH);
    if (rename(SD_LOG_META_PATH, SD_LOG_META_BAK_PATH) != 0 && errno != ENOENT) {
        remove(SD_LOG_META_TMP_PATH);
        telemetry_counters_inc_sd_write_fail();
        sd_log_store_mark_degraded();
        return ESP_FAIL;
    }

    if (rename(SD_LOG_META_TMP_PATH, SD_LOG_META_PATH) != 0) {
        if (rename(SD_LOG_META_BAK_PATH, SD_LOG_META_PATH) != 0) {
            sd_log_store_mark_degraded();
        }
        remove(SD_LOG_META_TMP_PATH);
        telemetry_counters_inc_sd_write_fail();
        return ESP_FAIL;
    }

    remove(SD_LOG_META_BAK_PATH);
    return ESP_OK;
}

static esp_err_t sd_log_store_read_meta(void) {
    FILE *fp = fopen(SD_LOG_META_PATH, "rb");
    if (fp == NULL) {
        if (errno != ENOENT) {
            ESP_LOGW(TAG,
                     "open meta for read failed path=%s errno=%d (%s)",
                     SD_LOG_META_PATH,
                     errno,
                     strerror(errno));
            sd_log_store_mark_degraded();
        }
        memset(&s_ctx.meta, 0, sizeof(s_ctx.meta));
        return ESP_OK;
    }

    size_t read_len = fread(&s_ctx.meta, 1, sizeof(s_ctx.meta), fp);
    fclose(fp);
    if (read_len != sizeof(s_ctx.meta)) {
        memset(&s_ctx.meta, 0, sizeof(s_ctx.meta));
        sd_log_store_mark_degraded();
    }
    return ESP_OK;
}

static esp_err_t sd_log_store_write_meta(void) {
    esp_err_t err = sd_log_store_write_meta_snapshot(&s_ctx.meta);
    if (err != ESP_OK) {
        return err;
    }

    if (s_ctx.state == SD_LOG_STATE_DEGRADED) {
        s_ctx.state = SD_LOG_STATE_MOUNTED;
    }
    return ESP_OK;
}

static bool sd_log_store_card_present(void) {
    if (!s_ctx.cd_configured || PIN_SDMMC_CD == GPIO_NUM_NC) {
        return true;
    }

    int level = gpio_get_level(PIN_SDMMC_CD);
    return level == 0;
}

static esp_err_t sd_log_store_ensure_dirs(void) {
    if (mkdir(SD_LOG_ROOT_DIR, 0775) != 0 && errno != EEXIST) {
        return ESP_FAIL;
    }
    if (mkdir(SD_LOG_META_DIR, 0775) != 0 && errno != EEXIST) {
        return ESP_FAIL;
    }
    if (mkdir(SD_LOG_LOG_DIR, 0775) != 0 && errno != EEXIST) {
        return ESP_FAIL;
    }
    return ESP_OK;
}

static esp_err_t sd_log_store_recover_meta_if_needed(void) {
    struct stat meta_st = {0};
    struct stat bak_st = {0};
    struct stat tmp_st = {0};

    bool has_meta = stat(SD_LOG_META_PATH, &meta_st) == 0;
    bool has_bak = stat(SD_LOG_META_BAK_PATH, &bak_st) == 0;
    bool has_tmp = stat(SD_LOG_META_TMP_PATH, &tmp_st) == 0;

    if (has_meta) {
        if (has_tmp) {
            remove(SD_LOG_META_TMP_PATH);
        }
        if (has_bak) {
            remove(SD_LOG_META_BAK_PATH);
        }
        return ESP_OK;
    }

    if (has_tmp) {
        if (rename(SD_LOG_META_TMP_PATH, SD_LOG_META_PATH) != 0) {
            remove(SD_LOG_META_TMP_PATH);
            sd_log_store_mark_degraded();
            return ESP_FAIL;
        }
        if (has_bak) {
            remove(SD_LOG_META_BAK_PATH);
        }
        ESP_LOGW(TAG, "recover metadata from temp");
        return ESP_OK;
    }

    if (has_bak) {
        if (rename(SD_LOG_META_BAK_PATH, SD_LOG_META_PATH) != 0) {
            sd_log_store_mark_degraded();
            return ESP_FAIL;
        }
        ESP_LOGW(TAG, "recover metadata from backup");
    }

    return ESP_OK;
}

static esp_err_t sd_log_store_recover_data_if_needed(void) {
    struct stat log_st = {0};
    struct stat bak_st = {0};
    struct stat tmp_st = {0};

    bool has_log = stat(SD_LOG_DATA_PATH, &log_st) == 0;
    bool has_bak = stat(SD_LOG_DATA_BAK_PATH, &bak_st) == 0;
    bool has_tmp = stat(SD_LOG_DATA_TMP_PATH, &tmp_st) == 0;

    if (has_log) {
        if (has_tmp) {
            remove(SD_LOG_DATA_TMP_PATH);
        }
        if (has_bak) {
            remove(SD_LOG_DATA_BAK_PATH);
        }
        return ESP_OK;
    }

    if (has_tmp) {
        if (rename(SD_LOG_DATA_TMP_PATH, SD_LOG_DATA_PATH) != 0) {
            remove(SD_LOG_DATA_TMP_PATH);
            sd_log_store_mark_degraded();
            return ESP_FAIL;
        }
        if (has_bak) {
            remove(SD_LOG_DATA_BAK_PATH);
        }
        ESP_LOGW(TAG, "recover queue.log from temp");
        return ESP_OK;
    }

    if (has_bak) {
        if (rename(SD_LOG_DATA_BAK_PATH, SD_LOG_DATA_PATH) != 0) {
            sd_log_store_mark_degraded();
            return ESP_FAIL;
        }
        ESP_LOGW(TAG, "recover queue.log from backup");
    }

    return ESP_OK;
}

static esp_err_t sd_log_store_apply_host_slot(sdmmc_host_t *host, sdmmc_slot_config_t *slot) {
    if (PIN_SDMMC_CLK == GPIO_NUM_NC || PIN_SDMMC_CMD == GPIO_NUM_NC || PIN_SDMMC_D0 == GPIO_NUM_NC) {
        ESP_LOGW(TAG,
                 "SD GPIO map unset (clk=%d cmd=%d d0=%d); skip SD mount",
                 (int)PIN_SDMMC_CLK,
                 (int)PIN_SDMMC_CMD,
                 (int)PIN_SDMMC_D0);
        return ESP_ERR_NOT_SUPPORTED;
    }

    (void)host;
    slot->clk = PIN_SDMMC_CLK;
    slot->cmd = PIN_SDMMC_CMD;
    slot->d0 = PIN_SDMMC_D0;
    slot->d1 = PIN_SDMMC_D1;
    slot->d2 = PIN_SDMMC_D2;
    slot->d3 = PIN_SDMMC_D3;
    slot->width = SDMMC_BUS_WIDTH;

    if (PIN_SDMMC_CD != GPIO_NUM_NC) {
        gpio_config_t cd_cfg = {
            .pin_bit_mask = 1ULL << PIN_SDMMC_CD,
            .mode = GPIO_MODE_INPUT,
            .pull_up_en = GPIO_PULLUP_ENABLE,
            .pull_down_en = GPIO_PULLDOWN_DISABLE,
            .intr_type = GPIO_INTR_DISABLE,
        };
        if (gpio_config(&cd_cfg) == ESP_OK) {
            s_ctx.cd_configured = true;
            slot->cd = PIN_SDMMC_CD;
        } else {
            s_ctx.cd_configured = false;
            ESP_LOGW(TAG, "SD CD pin config failed, fallback to probe mount");
        }
    } else {
        s_ctx.cd_configured = false;
    }

    if (PIN_SDMMC_WP != GPIO_NUM_NC) {
        slot->wp = PIN_SDMMC_WP;
    }

    return ESP_OK;
}

static esp_err_t sd_log_store_parse_record(const char *line, sd_log_record_t *out_record) {
    ESP_RETURN_ON_NULL(line, ESP_ERR_INVALID_ARG, TAG, "line null");
    ESP_RETURN_ON_NULL(out_record, ESP_ERR_INVALID_ARG, TAG, "record null");

    sd_log_record_t rec = {0};

    int matched = sscanf(line,
                         "%" SCNu32 "|%" SCNu64 "|%" SCNu32 "|%hhu|%hhu|%hhu|%hhu|%hhu|%383[^\n]",
                         &rec.seq,
                         &rec.ts_ms,
                         &rec.session_id,
                         &rec.type,
                         &rec.critical,
                         &rec.gps_fix,
                         &rec.net_up,
                         &rec.time_trusted,
                         rec.payload);
    if (matched == 9) {
        *out_record = rec;
        return ESP_OK;
    }

    matched = sscanf(line,
                     "%" SCNu32 "|%" SCNu64 "|%" SCNu32 "|%hhu|%hhu|%hhu|%hhu|%383[^\n]",
                     &rec.seq,
                     &rec.ts_ms,
                     &rec.session_id,
                     &rec.type,
                     &rec.critical,
                     &rec.gps_fix,
                     &rec.net_up,
                     rec.payload);
    ESP_RETURN_ON_FALSE(matched == 8, ESP_FAIL, TAG, "parse record failed");
    rec.time_trusted = 0;
    *out_record = rec;
    return ESP_OK;
}

esp_err_t sd_log_store_init(void) {
    memset(&s_ctx, 0, sizeof(s_ctx));
    sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
    s_ctx.initialized = true;
    return ESP_OK;
}

esp_err_t sd_log_store_mount(void) {
    ESP_RETURN_ON_FALSE(s_ctx.initialized, ESP_ERR_INVALID_STATE, TAG, "not initialized");
    if (s_ctx.mounted) {
        return ESP_OK;
    }

    sdmmc_host_t host = SDMMC_HOST_DEFAULT();
    host.max_freq_khz = SDMMC_FREQ_PROBING;

    sdmmc_slot_config_t slot = SDMMC_SLOT_CONFIG_DEFAULT();
    esp_err_t err = sd_log_store_apply_host_slot(&host, &slot);
    if (err == ESP_ERR_NOT_SUPPORTED) {
        sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
        return ESP_ERR_NOT_SUPPORTED;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "slot config failed");

    if (!sd_log_store_card_present()) {
        sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
        return ESP_ERR_NOT_FOUND;
    }

    esp_vfs_fat_mount_config_t mount_cfg = {
        .format_if_mount_failed = true,
        .max_files = 6,
        .allocation_unit_size = 16 * 1024,
    };

    err = esp_vfs_fat_sdmmc_mount(SD_LOG_MOUNT_POINT, &host, &slot, &mount_cfg, &s_ctx.card);
    if (err != ESP_OK && slot.width > 1) {
        ESP_LOGW(TAG, "SD mount failed in %u-bit mode (%s), retry 1-bit", (unsigned)slot.width, esp_err_to_name(err));
        slot.width = 1;
        err = esp_vfs_fat_sdmmc_mount(SD_LOG_MOUNT_POINT, &host, &slot, &mount_cfg, &s_ctx.card);
    }
    if (err != ESP_OK) {
        sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
        return err;
    }

    sd_log_store_set_state(SD_LOG_STATE_MOUNTED);
    err = sd_log_store_ensure_dirs();
    if (err != ESP_OK) {
        sd_log_store_unmount();
        return err;
    }

    err = sd_log_store_recover_meta_if_needed();
    if (err != ESP_OK) {
        sd_log_store_unmount();
        return err;
    }

    err = sd_log_store_recover_data_if_needed();
    if (err != ESP_OK) {
        sd_log_store_unmount();
        return err;
    }

    err = sd_log_store_read_meta();
    if (err != ESP_OK) {
        sd_log_store_unmount();
        return err;
    }

    if (s_ctx.state == SD_LOG_STATE_DEGRADED) {
        ESP_LOGW(TAG, "SD store mounted in degraded mode");
    }

    return ESP_OK;
}

void sd_log_store_unmount(void) {
    if (!s_ctx.mounted) {
        sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
        return;
    }
    esp_vfs_fat_sdcard_unmount(SD_LOG_MOUNT_POINT, s_ctx.card);
    s_ctx.card = NULL;
    sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
}

bool sd_log_store_is_mounted(void) {
    if (!s_ctx.mounted) {
        return false;
    }

    if (!sd_log_store_card_present()) {
        ESP_LOGW(TAG, "SD card removed, unmounting store");
        sd_log_store_unmount();
        return false;
    }

    return true;
}

esp_err_t sd_log_store_start_session(uint32_t session_id) {
    ESP_RETURN_ON_FALSE(s_ctx.mounted, ESP_ERR_INVALID_STATE, TAG, "not mounted");
    s_ctx.meta.session_id = session_id;
    s_ctx.meta.clean_shutdown = 0;
    return sd_log_store_write_meta();
}

esp_err_t sd_log_store_stop_session(bool clean_shutdown) {
    ESP_RETURN_ON_FALSE(s_ctx.mounted, ESP_ERR_INVALID_STATE, TAG, "not mounted");
    s_ctx.meta.clean_shutdown = clean_shutdown ? 1 : 0;
    return sd_log_store_write_meta();
}

esp_err_t sd_log_store_append(const sd_log_record_t *record) {
    ESP_RETURN_ON_FALSE(s_ctx.mounted, ESP_ERR_INVALID_STATE, TAG, "not mounted");
    ESP_RETURN_ON_NULL(record, ESP_ERR_INVALID_ARG, TAG, "record null");

    FILE *fp = fopen(SD_LOG_DATA_PATH, "ab");
    if (fp == NULL) {
        telemetry_counters_inc_sd_write_fail();
        sd_log_store_mark_degraded();
        return ESP_FAIL;
    }

    int write_len = fprintf(fp,
                            "%u|%llu|%u|%u|%u|%u|%u|%u|%s\n",
                            (unsigned)record->seq,
                            (unsigned long long)record->ts_ms,
                            (unsigned)record->session_id,
                            (unsigned)record->type,
                            (unsigned)record->critical,
                            (unsigned)record->gps_fix,
                            (unsigned)record->net_up,
                            (unsigned)record->time_trusted,
                            record->payload);
    if (write_len <= 0) {
        fclose(fp);
        telemetry_counters_inc_sd_write_fail();
        sd_log_store_mark_degraded();
        return ESP_FAIL;
    }

    fflush(fp);
    if (fsync(fileno(fp)) != 0) {
        fclose(fp);
        telemetry_counters_inc_sd_fsync_fail();
        sd_log_store_mark_degraded();
        return ESP_FAIL;
    }

    fclose(fp);
    telemetry_counters_inc_sd_write_ok();

    sd_log_meta_t meta = s_ctx.meta;
    meta.write_seq = record->seq;
    if (meta.replay_seq == 0) {
        meta.replay_seq = record->seq;
    }

    esp_err_t err = sd_log_store_write_meta_snapshot(&meta);
    if (err != ESP_OK) {
        return err;
    }

    s_ctx.meta = meta;
    if (s_ctx.state == SD_LOG_STATE_DEGRADED) {
        s_ctx.state = SD_LOG_STATE_MOUNTED;
    }
    return ESP_OK;
}

esp_err_t sd_log_store_get_meta(sd_log_meta_t *out_meta) {
    ESP_RETURN_ON_NULL(out_meta, ESP_ERR_INVALID_ARG, TAG, "out_meta null");
    *out_meta = s_ctx.meta;
    return ESP_OK;
}

esp_err_t sd_log_store_set_ack_seq_critical(uint32_t ack_seq_critical) {
    sd_log_meta_t meta = s_ctx.meta;
    if (ack_seq_critical > meta.ack_seq_critical) {
        meta.ack_seq_critical = ack_seq_critical;
    }

    esp_err_t err = sd_log_store_write_meta_snapshot(&meta);
    if (err != ESP_OK) {
        return err;
    }

    s_ctx.meta = meta;
    if (s_ctx.state == SD_LOG_STATE_DEGRADED) {
        s_ctx.state = SD_LOG_STATE_MOUNTED;
    }
    return ESP_OK;
}

esp_err_t sd_log_store_set_replay_seq(uint32_t replay_seq) {
    sd_log_meta_t meta = s_ctx.meta;
    meta.replay_seq = replay_seq;

    esp_err_t err = sd_log_store_write_meta_snapshot(&meta);
    if (err != ESP_OK) {
        return err;
    }

    s_ctx.meta = meta;
    if (s_ctx.state == SD_LOG_STATE_DEGRADED) {
        s_ctx.state = SD_LOG_STATE_MOUNTED;
    }
    return ESP_OK;
}

esp_err_t sd_log_store_ack_critical_and_advance_replay(uint32_t ack_seq_critical, uint32_t replay_seq) {
    sd_log_meta_t meta = s_ctx.meta;
    if (ack_seq_critical > meta.ack_seq_critical) {
        meta.ack_seq_critical = ack_seq_critical;
    }
    meta.replay_seq = replay_seq;

    esp_err_t err = sd_log_store_write_meta_snapshot(&meta);
    if (err != ESP_OK) {
        return err;
    }

    s_ctx.meta = meta;
    if (s_ctx.state == SD_LOG_STATE_DEGRADED) {
        s_ctx.state = SD_LOG_STATE_MOUNTED;
    }
    return ESP_OK;
}

esp_err_t sd_log_store_peek_next(uint32_t min_seq, sd_log_record_t *out_record) {
    ESP_RETURN_ON_FALSE(s_ctx.mounted, ESP_ERR_INVALID_STATE, TAG, "not mounted");
    ESP_RETURN_ON_NULL(out_record, ESP_ERR_INVALID_ARG, TAG, "out_record null");

    FILE *fp = fopen(SD_LOG_DATA_PATH, "rb");
    if (fp == NULL) {
        return ESP_ERR_NOT_FOUND;
    }

    char line[SD_LOG_LINE_MAX] = {0};
    esp_err_t found = ESP_ERR_NOT_FOUND;
    while (fgets(line, sizeof(line), fp) != NULL) {
        sd_log_record_t rec = {0};
        if (sd_log_store_parse_record(line, &rec) != ESP_OK) {
            telemetry_counters_inc_replay_drop();
            continue;
        }
        if (rec.seq < min_seq) {
            continue;
        }
        *out_record = rec;
        found = ESP_OK;
        break;
    }

    fclose(fp);
    return found;
}

esp_err_t sd_log_store_gc_if_needed(void) {
    ESP_RETURN_ON_FALSE(s_ctx.mounted, ESP_ERR_INVALID_STATE, TAG, "not mounted");

    sd_log_stats_t stats = {0};
    esp_err_t err = sd_log_store_get_stats(&stats);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "stats failed");

    size_t hard_limit = (stats.quota_bytes * (size_t)CONFIG_TRACKER_SD_LOG_HARD_QUOTA_PERCENT) / 100U;
    if (stats.bytes_used <= hard_limit) {
        return ESP_OK;
    }

    telemetry_counters_inc_quota_hit();

    FILE *in = fopen(SD_LOG_DATA_PATH, "rb");
    if (in == NULL) {
        return ESP_OK;
    }

    FILE *out = fopen(SD_LOG_DATA_TMP_PATH, "wb");
    if (out == NULL) {
        fclose(in);
        sd_log_store_mark_degraded();
        return ESP_FAIL;
    }

    char line[SD_LOG_LINE_MAX] = {0};
    while (fgets(line, sizeof(line), in) != NULL) {
        sd_log_record_t rec = {0};
        if (sd_log_store_parse_record(line, &rec) != ESP_OK) {
            telemetry_counters_inc_replay_drop();
            continue;
        }
        if (rec.critical == 0 && rec.seq <= s_ctx.meta.ack_seq_critical) {
            continue;
        }
        if (fputs(line, out) == EOF) {
            fclose(out);
            fclose(in);
            remove(SD_LOG_DATA_TMP_PATH);
            sd_log_store_mark_degraded();
            return ESP_FAIL;
        }
    }

    fflush(out);
    if (fsync(fileno(out)) != 0) {
        fclose(out);
        fclose(in);
        remove(SD_LOG_DATA_TMP_PATH);
        telemetry_counters_inc_sd_fsync_fail();
        sd_log_store_mark_degraded();
        return ESP_FAIL;
    }
    fclose(out);
    fclose(in);

    remove(SD_LOG_DATA_BAK_PATH);
    if (rename(SD_LOG_DATA_PATH, SD_LOG_DATA_BAK_PATH) != 0) {
        remove(SD_LOG_DATA_TMP_PATH);
        ESP_LOGW(TAG, "gc rotate to backup failed");
        sd_log_store_mark_degraded();
        return ESP_FAIL;
    }

    if (rename(SD_LOG_DATA_TMP_PATH, SD_LOG_DATA_PATH) != 0) {
        if (rename(SD_LOG_DATA_BAK_PATH, SD_LOG_DATA_PATH) != 0) {
            ESP_LOGW(TAG, "gc rollback from backup failed");
            sd_log_store_mark_degraded();
        }
        remove(SD_LOG_DATA_TMP_PATH);
        ESP_LOGW(TAG, "gc promote temp log failed");
        return ESP_FAIL;
    }

    remove(SD_LOG_DATA_BAK_PATH);
    return ESP_OK;
}

esp_err_t sd_log_store_get_stats(sd_log_stats_t *out_stats) {
    ESP_RETURN_ON_NULL(out_stats, ESP_ERR_INVALID_ARG, TAG, "out_stats null");
    memset(out_stats, 0, sizeof(*out_stats));

    out_stats->quota_bytes = (size_t)CONFIG_TRACKER_SD_LOG_QUOTA_BYTES;
    out_stats->write_seq = s_ctx.meta.write_seq;
    out_stats->ack_seq_critical = s_ctx.meta.ack_seq_critical;
    out_stats->mounted = s_ctx.mounted;

    struct stat st = {0};
    if (stat(SD_LOG_DATA_PATH, &st) == 0) {
        out_stats->bytes_used = (size_t)st.st_size;
    }

    if (s_ctx.mounted && !sd_log_store_card_present()) {
        sd_log_store_unmount();
        out_stats->mounted = false;
    }

    return ESP_OK;
}
