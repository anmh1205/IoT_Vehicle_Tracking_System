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

/**
 * @file sd_log_store.c
 * @brief SD-backed append-only queue with crash-safe metadata rotation.
 * This translation unit belongs to the SDMMC FATFS storage adapter layer and keeps adapter-local state, crash-recovery sequencing, and storage policy isolated behind the exported entry points.
 */

// File-local constants, retained state, and helper wiring stay private here so
// higher layers interact with this module through its exported contract.


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
#define SD_LOG_LINE_MAX (SD_LOG_RECORD_PAYLOAD_MAX_LEN + 256U)

static const char *TAG = "SD_LOG_STORE";

typedef enum {
    /** Card missing, mount failed, or store intentionally unavailable. */
    SD_LOG_STATE_UNAVAILABLE = 0,
    /** Mount + metadata are healthy enough for normal operation. */
    SD_LOG_STATE_MOUNTED,
    /** Store is usable but one recovery/write anomaly was observed. */
    SD_LOG_STATE_DEGRADED,
} sd_log_state_t;

typedef struct {
    /** `true` once init ran. */
    bool initialized;
    /** Fast path mirror of `state == MOUNTED`. */
    bool mounted;
    /** Whether the optional card-detect GPIO was configured successfully. */
    bool cd_configured;
    /** Current health state of the SD store. */
    sd_log_state_t state;
    /** Card handle returned by `esp_vfs_fat_sdmmc_mount`. */
    sdmmc_card_t *card;
    /** In-memory copy of persistent queue metadata. */
    sd_log_meta_t meta;
    /** Cache validity for `peek_next` sequential scans. */
    bool peek_cache_valid;
    /** Minimum sequence number that the cached file offset can satisfy. */
    uint32_t peek_cache_min_seq;
    /** File offset after the last successfully parsed replay record. */
    long peek_cache_offset;
} sd_log_store_ctx_t;

static sd_log_store_ctx_t s_ctx;

static void sd_log_store_reset_peek_cache(void) {
    // Reset the peek cache here whenever card state changes so replay never resumes from a stale file offset.
    s_ctx.peek_cache_valid = false;
    s_ctx.peek_cache_min_seq = 0;
    s_ctx.peek_cache_offset = 0;
}

static void sd_log_store_set_state(sd_log_state_t state) {
    // Mirror the storage health state here so mount availability and cache validity stay in sync.
    s_ctx.state = state;
    s_ctx.mounted = state == SD_LOG_STATE_MOUNTED;
    if (state != SD_LOG_STATE_MOUNTED) {
        /* Cached log offsets are meaningless after card removal/unmount/recovery. */
        sd_log_store_reset_peek_cache();
    }
}

static void sd_log_store_mark_degraded(void) {
    // Mark the store degraded here when I/O guarantees weaken but the card is still partially usable.
    if (s_ctx.state == SD_LOG_STATE_MOUNTED) {
        /* Degraded means "still mounted, but prior I/O guarantees may have weakened". */
        s_ctx.state = SD_LOG_STATE_DEGRADED;
    }
}

static esp_err_t sd_log_store_write_meta_snapshot(const sd_log_meta_t *meta) {
    // Write one crash-safe metadata snapshot here before the live queue pointers move forward.
    ESP_RETURN_ON_NULL(meta, ESP_ERR_INVALID_ARG, TAG, "meta null");

    /* Write metadata through temp -> backup -> live rotation to survive reset mid-update. */
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
    // Read the persisted queue metadata here so replay and append logic resume from the last committed cursor set.
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
        /* Partial metadata means we keep operating but treat it as degraded. */
        memset(&s_ctx.meta, 0, sizeof(s_ctx.meta));
        sd_log_store_mark_degraded();
    }
    return ESP_OK;
}

static esp_err_t sd_log_store_write_meta(void) {
    // Persist the in-memory metadata copy here after callers update replay or acknowledgement cursors.
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
    // Check card presence here so mount and replay paths can bail out before touching an absent SD bus.
    if (!s_ctx.cd_configured || PIN_SDMMC_CD == GPIO_NUM_NC) {
        return true;
    }

    int level = gpio_get_level(PIN_SDMMC_CD);
    return level == 0;
}

static esp_err_t sd_log_store_ensure_dirs(void) {
    // Ensure the tracker directory layout exists here before metadata or queue files are opened.
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
    // Recover metadata from backup files here when the primary snapshot was interrupted mid-rotation.
    struct stat meta_st = {0};
    struct stat bak_st = {0};
    struct stat tmp_st = {0};

    bool has_meta = stat(SD_LOG_META_PATH, &meta_st) == 0;
    bool has_bak = stat(SD_LOG_META_BAK_PATH, &bak_st) == 0;
    bool has_tmp = stat(SD_LOG_META_TMP_PATH, &tmp_st) == 0;

    if (has_meta) {
        /* Normal case: live file exists, so stale temp/backup can be discarded. */
        if (has_tmp) {
            remove(SD_LOG_META_TMP_PATH);
        }
        if (has_bak) {
            remove(SD_LOG_META_BAK_PATH);
        }
        return ESP_OK;
    }

    if (has_tmp) {
        /* Crash may have happened after temp write but before promote to live. */
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
        /* Last fallback: restore the previous committed snapshot. */
        if (rename(SD_LOG_META_BAK_PATH, SD_LOG_META_PATH) != 0) {
            sd_log_store_mark_degraded();
            return ESP_FAIL;
        }
        ESP_LOGW(TAG, "recover metadata from backup");
    }

    return ESP_OK;
}

static esp_err_t sd_log_store_recover_data_if_needed(void) {
    // Recover the queue log here when a temp or backup file indicates an interrupted append or compaction pass.
    sd_log_store_reset_peek_cache();

    struct stat log_st = {0};
    struct stat bak_st = {0};
    struct stat tmp_st = {0};

    bool has_log = stat(SD_LOG_DATA_PATH, &log_st) == 0;
    bool has_bak = stat(SD_LOG_DATA_BAK_PATH, &bak_st) == 0;
    bool has_tmp = stat(SD_LOG_DATA_TMP_PATH, &tmp_st) == 0;

    if (has_log) {
        /* Normal case: log exists, so stale temp/backup artifacts can be removed. */
        if (has_tmp) {
            remove(SD_LOG_DATA_TMP_PATH);
        }
        if (has_bak) {
            remove(SD_LOG_DATA_BAK_PATH);
        }
        return ESP_OK;
    }

    if (has_tmp) {
        /* Compaction or append rotation may have been interrupted before promotion. */
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
        /* Restore the last known-good queue file if the live file disappeared. */
        if (rename(SD_LOG_DATA_BAK_PATH, SD_LOG_DATA_PATH) != 0) {
            sd_log_store_mark_degraded();
            return ESP_FAIL;
        }
        ESP_LOGW(TAG, "recover queue.log from backup");
    }

    return ESP_OK;
}

static esp_err_t sd_log_store_apply_host_slot(sdmmc_host_t *host, sdmmc_slot_config_t *slot) {
    // Apply the board-specific SDMMC slot selection here before mounting so the host controller matches wiring.
    if (PIN_SDMMC_CLK == GPIO_NUM_NC || PIN_SDMMC_CMD == GPIO_NUM_NC || PIN_SDMMC_D0 == GPIO_NUM_NC) {
        ESP_LOGW(TAG,
                 "SD GPIO map unset (clk=%d cmd=%d d0=%d); skip SD mount",
                 (int)PIN_SDMMC_CLK,
                 (int)PIN_SDMMC_CMD,
                 (int)PIN_SDMMC_D0);
        return ESP_ERR_NOT_SUPPORTED;
    }

    (void)host;
    /* Hardware pin mapping is defined in `pin_map.h` and may vary by board revision. */
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

static bool sd_log_store_line_complete(const char *line) {
    // Decide here whether the current log line is complete enough to parse into one offline queue record.
    if (line == NULL) {
        return false;
    }

    /*
     * fgets returns a partial line when the on-disk record exceeds our bounded
     * buffer. Treat that as corruption and discard the remainder so the parser
     * never replays a truncated JSON payload.
     */
    size_t len = strlen(line);
    return len == 0U || line[len - 1U] == '\n' || len < (SD_LOG_LINE_MAX - 1U);
}

static void sd_log_store_discard_line_remainder(FILE *fp) {
    // Drop the unread tail of a corrupt line here so the next parse attempt resumes at a clean record boundary.
    if (fp == NULL) {
        return;
    }

    int ch = 0;
    while ((ch = fgetc(fp)) != EOF && ch != '\n') {
    }
}

static esp_err_t sd_log_store_copy_payload_from_line(const char *payload_start, sd_log_record_t *record) {
    // Copy log store copy payload from line into the destination buffer or struct while keeping bounds checks local here.
    ESP_RETURN_ON_NULL(payload_start, ESP_ERR_INVALID_ARG, TAG, "payload start null");
    ESP_RETURN_ON_NULL(record, ESP_ERR_INVALID_ARG, TAG, "record null");

    /* Payload is the final pipe-delimited field and may contain JSON punctuation. */
    size_t payload_len = strcspn(payload_start, "\r\n");
    ESP_RETURN_ON_FALSE(payload_len > 0U, ESP_FAIL, TAG, "record payload empty");
    ESP_RETURN_ON_FALSE(payload_len < sizeof(record->payload),
                        ESP_ERR_INVALID_SIZE,
                        TAG,
                        "record payload too long len=%u cap=%u",
                        (unsigned)payload_len,
                        (unsigned)sizeof(record->payload));

    memcpy(record->payload, payload_start, payload_len);
    record->payload[payload_len] = '\0';
    return ESP_OK;
}

static esp_err_t sd_log_store_parse_record(const char *line, sd_log_record_t *out_record) {
    // Decode raw log store parse record into the normalized form the rest of the module expects.
    ESP_RETURN_ON_NULL(line, ESP_ERR_INVALID_ARG, TAG, "line null");
    ESP_RETURN_ON_NULL(out_record, ESP_ERR_INVALID_ARG, TAG, "record null");

    sd_log_record_t rec = {0};
    int payload_offset = 0;

    /*
     * Newer format stores `time_trusted`.
     * Fallback parser keeps older log files readable after firmware upgrades.
     */
    int matched = sscanf(line,
                         "%" SCNu32 "|%" SCNu64 "|%" SCNu32 "|%hhu|%hhu|%hhu|%hhu|%hhu|%n",
                         &rec.seq,
                         &rec.ts_ms,
                         &rec.session_id,
                         &rec.type,
                         &rec.critical,
                         &rec.gps_fix,
                         &rec.net_up,
                         &rec.time_trusted,
                         &payload_offset);
    if (matched == 8 && payload_offset > 0 &&
        sd_log_store_copy_payload_from_line(&line[payload_offset], &rec) == ESP_OK) {
        *out_record = rec;
        return ESP_OK;
    }

    memset(&rec, 0, sizeof(rec));
    payload_offset = 0;
    matched = sscanf(line,
                     "%" SCNu32 "|%" SCNu64 "|%" SCNu32 "|%hhu|%hhu|%hhu|%hhu|%n",
                     &rec.seq,
                     &rec.ts_ms,
                     &rec.session_id,
                     &rec.type,
                     &rec.critical,
                     &rec.gps_fix,
                     &rec.net_up,
                     &payload_offset);
    ESP_RETURN_ON_FALSE(matched == 7 && payload_offset > 0, ESP_FAIL, TAG, "parse record failed");
    rec.time_trusted = 0;
    ESP_RETURN_ON_FALSE(sd_log_store_copy_payload_from_line(&line[payload_offset], &rec) == ESP_OK,
                        ESP_FAIL,
                        TAG,
                        "parse payload failed");
    *out_record = rec;
    return ESP_OK;
}

/**
 * @brief Initialize SD log store.
 *
 * @return ESP_OK on success.
 */
esp_err_t sd_log_store_init(void) {
    // Initialize the SD-backed store context here before any mount or replay logic starts using it.
    memset(&s_ctx, 0, sizeof(s_ctx));
    sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
    sd_log_store_reset_peek_cache();
    s_ctx.initialized = true;
    return ESP_OK;
}

/**
 * @brief Mount SD card and initialize store.
 *
 * @return ESP_OK on success.
 */
esp_err_t sd_log_store_mount(void) {
    // Mount the FATFS volume here and restore queue metadata so offline logging can resume after boot.
    ESP_RETURN_ON_FALSE(s_ctx.initialized, ESP_ERR_INVALID_STATE, TAG, "not initialized");
    if (s_ctx.mounted) {
        return ESP_OK;
    }

    sdmmc_host_t host = SDMMC_HOST_DEFAULT();
    host.max_freq_khz = SDMMC_FREQ_PROBING;

    sdmmc_slot_config_t slot = SDMMC_SLOT_CONFIG_DEFAULT();
    esp_err_t err = sd_log_store_apply_host_slot(&host, &slot);
    if (err == ESP_ERR_NOT_SUPPORTED) {
        // Boards without SD routing keep the store disabled cleanly instead of surfacing repeated mount noise.
        sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
        return ESP_ERR_NOT_SUPPORTED;
    }
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "slot config failed");

    if (!sd_log_store_card_present()) {
        // A missing card is treated as a runtime availability issue, not a fatal initialization error for the firmware.
        sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
        return ESP_ERR_NOT_FOUND;
    }

    esp_vfs_fat_mount_config_t mount_cfg = {
        .format_if_mount_failed = false,
        .max_files = 6,
        .allocation_unit_size = 16 * 1024,
    };

    err = esp_vfs_fat_sdmmc_mount(SD_LOG_MOUNT_POINT, &host, &slot, &mount_cfg, &s_ctx.card);
    if (err != ESP_OK && slot.width > 1) {
        /* 1-bit fallback reduces signal-integrity sensitivity on rough prototypes/cabling. */
        ESP_LOGW(TAG, "SD mount failed in %u-bit mode (%s), retry 1-bit", (unsigned)slot.width, esp_err_to_name(err));
        slot.width = 1;
        err = esp_vfs_fat_sdmmc_mount(SD_LOG_MOUNT_POINT, &host, &slot, &mount_cfg, &s_ctx.card);
    }
    if (err != ESP_OK) {
        sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
        return err;
    }

    sd_log_store_set_state(SD_LOG_STATE_MOUNTED);
    // Directory/bootstrap recovery runs before metadata load so later reads see the most salvageable on-disk state.
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

    ESP_LOGI(TAG,
             "SD mounted root=%s session=%u write_seq=%u replay_seq=%u ack_critical=%u",
             SD_LOG_ROOT_DIR,
             (unsigned)s_ctx.meta.session_id,
             (unsigned)s_ctx.meta.write_seq,
             (unsigned)s_ctx.meta.replay_seq,
             (unsigned)s_ctx.meta.ack_seq_critical);

    return ESP_OK;
}

/**
 * @brief Unmount SD card.
 */
void sd_log_store_unmount(void) {
    // Unmount the card here and clear fast-path state so later calls cannot reuse stale file handles.
    if (!s_ctx.mounted) {
        sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
        return;
    }
    esp_vfs_fat_sdcard_unmount(SD_LOG_MOUNT_POINT, s_ctx.card);
    s_ctx.card = NULL;
    sd_log_store_set_state(SD_LOG_STATE_UNAVAILABLE);
}

/**
 * @brief Check if SD card is mounted.
 *
 * @return True if mounted.
 */
bool sd_log_store_is_mounted(void) {
    // Report the cached mount state here so callers can cheaply gate replay and append operations.
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

/**
 * @brief Start new session with ID.
 *
 * @param session_id Session ID.
 * @return ESP_OK on success.
 */
esp_err_t sd_log_store_start_session(uint32_t session_id) {
    // Stamp the active session ID here so every subsequent append carries the correct drive context.
    ESP_RETURN_ON_FALSE(s_ctx.mounted, ESP_ERR_INVALID_STATE, TAG, "not mounted");
    s_ctx.meta.session_id = session_id;
    s_ctx.meta.clean_shutdown = 0;
    return sd_log_store_write_meta();
}

/**
 * @brief Stop current session.
 *
 * @param clean_shutdown True for clean shutdown.
 * @return ESP_OK on success.
 */
esp_err_t sd_log_store_stop_session(bool clean_shutdown) {
    // Clear the active session marker here when the producer no longer wants new records tied to that drive.
    ESP_RETURN_ON_FALSE(s_ctx.mounted, ESP_ERR_INVALID_STATE, TAG, "not mounted");
    s_ctx.meta.clean_shutdown = clean_shutdown ? 1 : 0;
    return sd_log_store_write_meta();
}

esp_err_t sd_log_store_append(const sd_log_record_t *record) {
    // Append one serialized queue record here so offline telemetry survives modem or broker outages.
    ESP_RETURN_ON_FALSE(s_ctx.mounted, ESP_ERR_INVALID_STATE, TAG, "not mounted");
    ESP_RETURN_ON_NULL(record, ESP_ERR_INVALID_ARG, TAG, "record null");

    /*
     * Validate the caller's fixed-size payload buffer before printing it with
     * `%s`. A non-terminated payload would otherwise let fprintf walk past the
     * record and corrupt the append-only log line.
     */
    const char *payload_end = memchr(record->payload, '\0', sizeof(record->payload));
    ESP_RETURN_ON_FALSE(payload_end != NULL, ESP_ERR_INVALID_SIZE, TAG, "payload not null terminated");
    size_t payload_len = (size_t)(payload_end - record->payload);
    ESP_RETURN_ON_FALSE(payload_len > 0U, ESP_ERR_INVALID_ARG, TAG, "payload empty");
    ESP_RETURN_ON_FALSE(memchr(record->payload, '\r', payload_len) == NULL &&
                            memchr(record->payload, '\n', payload_len) == NULL,
                        ESP_ERR_INVALID_ARG,
                        TAG,
                        "payload contains newline");

    /* Queue data is append-only; ordering comes from `seq`, not file rewrites. */
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
        // A short/failed fprintf means the append-only journal line never became durable enough to advance metadata.
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

    /*
     * Metadata is updated after the log line reaches disk.
     * That ordering prefers replay duplicates over silent data loss after a reset.
     */
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
    // Return the current metadata snapshot here so diagnostics and replay code can inspect queue position.
    ESP_RETURN_ON_NULL(out_meta, ESP_ERR_INVALID_ARG, TAG, "out_meta null");
    *out_meta = s_ctx.meta;
    return ESP_OK;
}

esp_err_t sd_log_store_set_ack_seq_critical(uint32_t ack_seq_critical) {
    // Advance the critical-ack watermark here once the cloud has durably accepted important records.
    sd_log_meta_t meta = s_ctx.meta;
    if (ack_seq_critical > meta.ack_seq_critical) {
        /* ACK watermark is monotonic; never move it backward. */
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
    // Persist the replay cursor here after one or more queued records have been drained successfully.
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
    // Commit both critical acknowledgement and replay-cursor progress together so crash recovery keeps them aligned.
    sd_log_meta_t meta = s_ctx.meta;
    if (ack_seq_critical > meta.ack_seq_critical) {
        meta.ack_seq_critical = ack_seq_critical;
    }
    /* Commit ACK + replay advance together so a reset cannot split the two. */
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
    // Read the next replay candidate here without mutating durable cursors so callers can publish before committing.
    ESP_RETURN_ON_FALSE(s_ctx.mounted, ESP_ERR_INVALID_STATE, TAG, "not mounted");
    ESP_RETURN_ON_NULL(out_record, ESP_ERR_INVALID_ARG, TAG, "out_record null");

    FILE *fp = fopen(SD_LOG_DATA_PATH, "rb");
    if (fp == NULL) {
        return ESP_ERR_NOT_FOUND;
    }

    if (s_ctx.peek_cache_valid && min_seq >= s_ctx.peek_cache_min_seq) {
        /* Sequential replay usually asks for increasing seq numbers; seek from cached offset. */
        if (fseek(fp, s_ctx.peek_cache_offset, SEEK_SET) != 0) {
            sd_log_store_reset_peek_cache();
            (void)fseek(fp, 0, SEEK_SET);
        }
    }

    char line[SD_LOG_LINE_MAX] = {0};
    esp_err_t found = ESP_ERR_NOT_FOUND;
    while (fgets(line, sizeof(line), fp) != NULL) {
        // Scan forward until the first record at or above the requested replay cursor survives validation.
        if (!sd_log_store_line_complete(line)) {
            sd_log_store_discard_line_remainder(fp);
            telemetry_counters_inc_replay_drop();
            continue;
        }
        sd_log_record_t rec = {0};
        if (sd_log_store_parse_record(line, &rec) != ESP_OK) {
            telemetry_counters_inc_replay_drop();
            continue;
        }
        if (rec.seq < min_seq) {
            continue;
        }
        *out_record = rec;
        long next_offset = ftell(fp);
        if (next_offset >= 0) {
            /* Cache the location after this record for the next monotonic replay lookup. */
            s_ctx.peek_cache_valid = true;
            s_ctx.peek_cache_min_seq = rec.seq + 1;
            s_ctx.peek_cache_offset = next_offset;
        } else {
            sd_log_store_reset_peek_cache();
        }
        found = ESP_OK;
        break;
    }

    if (found != ESP_OK) {
        long end_offset = ftell(fp);
        if (end_offset >= 0) {
            /* Remember EOF so repeated empty peeks do not rescan the full log. */
            s_ctx.peek_cache_valid = true;
            s_ctx.peek_cache_min_seq = min_seq;
            s_ctx.peek_cache_offset = end_offset;
        } else {
            sd_log_store_reset_peek_cache();
        }
    }

    fclose(fp);
    return found;
}

esp_err_t sd_log_store_gc_if_needed(void) {
    // Compact the queue files here when replay progress leaves enough acknowledged history behind.
    ESP_RETURN_ON_FALSE(s_ctx.mounted, ESP_ERR_INVALID_STATE, TAG, "not mounted");

    sd_log_stats_t stats = {0};
    esp_err_t err = sd_log_store_get_stats(&stats);
    ESP_RETURN_ON_FALSE(err == ESP_OK, err, TAG, "stats failed");

    size_t hard_limit = (stats.quota_bytes * (size_t)CONFIG_TRACKER_SD_LOG_HARD_QUOTA_PERCENT) / 100U;
    if (stats.bytes_used <= hard_limit) {
        // Stay append-only until the hard quota is crossed; normal replay movement does not rewrite the log eagerly.
        return ESP_OK;
    }

    telemetry_counters_inc_quota_hit();

    FILE *in = fopen(SD_LOG_DATA_PATH, "rb");
    if (in == NULL) {
        // Missing data file means there is nothing left to compact, so treat GC as a no-op.
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
        // Re-parse each persisted line through the normal record decoder before deciding whether to keep it.
        if (!sd_log_store_line_complete(line)) {
            sd_log_store_discard_line_remainder(in);
            telemetry_counters_inc_replay_drop();
            continue;
        }
        sd_log_record_t rec = {0};
        if (sd_log_store_parse_record(line, &rec) != ESP_OK) {
            telemetry_counters_inc_replay_drop();
            continue;
        }
        /*
         * Critical records stay until the ACK watermark passes them.
         * Non-critical/raw records become disposable once older than that watermark.
         */
        if (rec.critical == 0 && rec.seq <= s_ctx.meta.ack_seq_critical) {
            continue;
        }
        if (fputs(line, out) == EOF) {
            // Abort compaction immediately on write failure so the original log stays intact until promotion time.
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

    /* Promote compacted file with the same temp/backup rotation strategy as metadata. */
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
    // Any offset cached against the old file layout becomes invalid once the compacted file is promoted.
    sd_log_store_reset_peek_cache();
    return ESP_OK;
}

esp_err_t sd_log_store_get_stats(sd_log_stats_t *out_stats) {
    // Summarize current queue depth and health here so diagnostics can report SD-backed buffering state.
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
