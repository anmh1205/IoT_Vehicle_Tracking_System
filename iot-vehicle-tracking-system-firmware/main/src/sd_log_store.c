#include "sd_log_store.h"

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
#define SD_LOG_META_PATH SD_LOG_META_DIR "/queue.meta"
#define SD_LOG_DATA_PATH SD_LOG_LOG_DIR "/queue.log"
#define SD_LOG_LINE_MAX 640

static const char *TAG = "SD_LOG_STORE";

typedef struct {
    bool initialized;
    bool mounted;
    sdmmc_card_t *card;
    sd_log_meta_t meta;
} sd_log_store_ctx_t;

static sd_log_store_ctx_t s_ctx;

static esp_err_t sd_log_store_read_meta(void) {
    FILE *fp = fopen(SD_LOG_META_PATH, "rb");
    if (fp == NULL) {
        memset(&s_ctx.meta, 0, sizeof(s_ctx.meta));
        return ESP_OK;
    }

    size_t read_len = fread(&s_ctx.meta, 1, sizeof(s_ctx.meta), fp);
    fclose(fp);
    if (read_len != sizeof(s_ctx.meta)) {
        memset(&s_ctx.meta, 0, sizeof(s_ctx.meta));
    }
    return ESP_OK;
}

static esp_err_t sd_log_store_write_meta(void) {
    FILE *fp = fopen(SD_LOG_META_PATH, "wb");
    ESP_RETURN_ON_NULL(fp, ESP_FAIL, TAG, "open meta for write failed");

    size_t write_len = fwrite(&s_ctx.meta, 1, sizeof(s_ctx.meta), fp);
    if (write_len != sizeof(s_ctx.meta)) {
        fclose(fp);
        telemetry_counters_inc_sd_write_fail();
        return ESP_FAIL;
    }

    fflush(fp);
    if (fsync(fileno(fp)) != 0) {
        fclose(fp);
        telemetry_counters_inc_sd_fsync_fail();
        return ESP_FAIL;
    }

    fclose(fp);
    return ESP_OK;
}

static esp_err_t sd_log_store_ensure_dirs(void) {
    mkdir(SD_LOG_ROOT_DIR, 0775);
    mkdir(SD_LOG_META_DIR, 0775);
    mkdir(SD_LOG_LOG_DIR, 0775);
    return ESP_OK;
}

static esp_err_t sd_log_store_apply_host_slot(sdmmc_host_t *host, sdmmc_slot_config_t *slot) {
    if (PIN_SDMMC_CLK == GPIO_NUM_NC || PIN_SDMMC_CMD == GPIO_NUM_NC || PIN_SDMMC_D0 == GPIO_NUM_NC) {
        ESP_LOGW(TAG, "SD GPIO map unset; skip SD mount");
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
        slot->cd = PIN_SDMMC_CD;
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
    *out_record = rec;
    return ESP_OK;
}

esp_err_t sd_log_store_init(void) {
    memset(&s_ctx, 0, sizeof(s_ctx));
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
        return ESP_ERR_NOT_SUPPORTED;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "slot config failed");

    esp_vfs_fat_mount_config_t mount_cfg = {
        .format_if_mount_failed = false,
        .max_files = 6,
        .allocation_unit_size = 16 * 1024,
    };

    err = esp_vfs_fat_sdmmc_mount(SD_LOG_MOUNT_POINT, &host, &slot, &mount_cfg, &s_ctx.card);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "esp_vfs_fat_sdmmc_mount failed");

    s_ctx.mounted = true;
    err = sd_log_store_ensure_dirs();
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "ensure dirs failed");
    err = sd_log_store_read_meta();
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "read meta failed");

    return ESP_OK;
}

void sd_log_store_unmount(void) {
    if (!s_ctx.mounted) {
        return;
    }
    esp_vfs_fat_sdcard_unmount(SD_LOG_MOUNT_POINT, s_ctx.card);
    s_ctx.card = NULL;
    s_ctx.mounted = false;
}

bool sd_log_store_is_mounted(void) {
    return s_ctx.mounted;
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
    ESP_RETURN_ON_NULL(fp, ESP_FAIL, TAG, "open queue log failed");

    int write_len = fprintf(fp,
                            "%u|%llu|%u|%u|%u|%u|%u|%s\n",
                            (unsigned)record->seq,
                            (unsigned long long)record->ts_ms,
                            (unsigned)record->session_id,
                            (unsigned)record->type,
                            (unsigned)record->critical,
                            (unsigned)record->gps_fix,
                            (unsigned)record->net_up,
                            record->payload);
    if (write_len <= 0) {
        fclose(fp);
        telemetry_counters_inc_sd_write_fail();
        return ESP_FAIL;
    }

    fflush(fp);
    if (fsync(fileno(fp)) != 0) {
        fclose(fp);
        telemetry_counters_inc_sd_fsync_fail();
        return ESP_FAIL;
    }

    fclose(fp);
    telemetry_counters_inc_sd_write_ok();

    s_ctx.meta.write_seq = record->seq;
    if (s_ctx.meta.replay_seq == 0) {
        s_ctx.meta.replay_seq = record->seq;
    }
    return sd_log_store_write_meta();
}

esp_err_t sd_log_store_get_meta(sd_log_meta_t *out_meta) {
    ESP_RETURN_ON_NULL(out_meta, ESP_ERR_INVALID_ARG, TAG, "out_meta null");
    *out_meta = s_ctx.meta;
    return ESP_OK;
}

esp_err_t sd_log_store_set_ack_seq_critical(uint32_t ack_seq_critical) {
    if (ack_seq_critical > s_ctx.meta.ack_seq_critical) {
        s_ctx.meta.ack_seq_critical = ack_seq_critical;
    }
    return sd_log_store_write_meta();
}

esp_err_t sd_log_store_set_replay_seq(uint32_t replay_seq) {
    s_ctx.meta.replay_seq = replay_seq;
    return sd_log_store_write_meta();
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

    char tmp_path[96] = SD_LOG_LOG_DIR "/queue.tmp";
    FILE *out = fopen(tmp_path, "wb");
    if (out == NULL) {
        fclose(in);
        return ESP_FAIL;
    }

    char line[SD_LOG_LINE_MAX] = {0};
    while (fgets(line, sizeof(line), in) != NULL) {
        sd_log_record_t rec = {0};
        if (sd_log_store_parse_record(line, &rec) != ESP_OK) {
            continue;
        }
        if (rec.critical == 0 && rec.seq <= s_ctx.meta.ack_seq_critical) {
            continue;
        }
        fputs(line, out);
    }

    fflush(out);
    fsync(fileno(out));
    fclose(out);
    fclose(in);

    remove(SD_LOG_DATA_PATH);
    rename(tmp_path, SD_LOG_DATA_PATH);
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
    return ESP_OK;
}
