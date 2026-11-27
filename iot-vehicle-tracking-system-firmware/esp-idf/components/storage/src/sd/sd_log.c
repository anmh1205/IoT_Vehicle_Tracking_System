/**
 * @file src/sd/sd_log.c
 * @brief SD log append, rotation and quota checks.
 *
 * SD mount calls the startup scan. The storage task owns file and counter mutation afterward.
 * Append borrows a request buffer and counts bytes after a full write and close. Rotation can reclaim older
 * files.
 * Callers submit log requests through the storage task interface.
 */
#include "sd/sd.h"
#include "storage_internal.h"

#include <dirent.h>
#include <stdio.h>
#include <sys/stat.h>

#define LOG_DIR SD_MOUNT "/log"   /**< Directory holding active and rotated logs. */

/* Startup reconstructs these counters. Only the storage task updates them afterward. */
static uint32_t s_log_idx;     /* Index of the active log file. */
static uint32_t s_log_size;    /* Current size of the active log file in bytes. */
static uint32_t s_log_total;   /* Total size of all log files in bytes. */

/**
 * @brief Read a numeric index following the L prefix.
 * Only the numeric conversion is checked.
 */
static bool parse_log_name(const char *n, uint32_t *idx)
{
    unsigned v;
    if (n[0] != 'L' || sscanf(n + 1, "%7u.TXT", &v) != 1) { return false; }
    *idx = v;
    return true;
}

/** @brief Rebuild the active log index and byte counters at startup. */
static void log_scan(void)
{
    DIR *d = opendir(LOG_DIR);
    if (d == NULL) { return; }
    struct dirent *de;
    while ((de = readdir(d)) != NULL) {
        uint32_t idx;
        if (!parse_log_name(de->d_name, &idx)) { continue; }
        char path[sizeof(LOG_DIR) + 1 + sizeof(de->d_name)];   /* A directory entry name is at most 255 characters. */
        snprintf(path, sizeof path, LOG_DIR "/%s", de->d_name);
        struct stat st;
        if (stat(path, &st) == 0) {
            s_log_total += (uint32_t)st.st_size;
            if (idx >= s_log_idx) { s_log_idx = idx; s_log_size = (uint32_t)st.st_size; }
        }
    }
    closedir(d);
}

void storage_sd_log_open(void)
{
    mkdir(LOG_DIR, 0775);
    log_scan();
}

/**
 * @brief Delete oldest eligible log files until the quota is satisfied.
 *
 * Directory scans choose the smallest index each time, avoiding an in-memory
 * index. Preserve the active log file.
 */
static void log_enforce_quota(void)
{
    while (s_log_total > storage_config_view()->log_quota_bytes) {
        DIR *d = opendir(LOG_DIR);
        if (d == NULL) { return; }
        uint32_t oldest = UINT32_MAX;
        struct dirent *de;
        while ((de = readdir(d)) != NULL) {
            uint32_t idx;
            if (parse_log_name(de->d_name, &idx) && idx < oldest) { oldest = idx; }
        }
        closedir(d);
        if (oldest == UINT32_MAX || oldest == s_log_idx) { return; }   /* Preserve the active log when reclaiming old files. */
        char path[48];
        snprintf(path, sizeof path, LOG_DIR "/L%07lu.TXT", (unsigned long)oldest);
        struct stat st;
        uint32_t sz = (stat(path, &st) == 0) ? (uint32_t)st.st_size : 0u;
        if (remove(path) != 0) { return; }
        s_log_total = (s_log_total > sz) ? s_log_total - sz : 0u;
    }
}

ivts_err_t storage_sd_log_write(const char *line, size_t len)
{
    if (!storage_sd_ok()) { return IVTS_ERR_INVALID_STATE; }
    if (s_log_size + len + 1u > storage_config_view()->log_file_max_bytes) {
        s_log_idx++;                                 /* The previous active log is now eligible for reclamation. */
        s_log_size = 0;
        log_enforce_quota();
    }
    char path[48];
    snprintf(path, sizeof path, LOG_DIR "/L%07lu.TXT", (unsigned long)s_log_idx);
    FILE *f = fopen(path, "a");
    if (f == NULL) { return IVTS_ERR_IO; }
    size_t w = fwrite(line, 1, len, f);
    w += fwrite("\n", 1, 1, f);
    /*
     * Closing the FatFs file flushes data and filesystem metadata through the
     * driver. Return a close failure to the caller.
     */
    int rc = fclose(f);
    if (w != len + 1u || rc != 0) { return IVTS_ERR_IO; }
    s_log_size += (uint32_t)(len + 1u);
    s_log_total += (uint32_t)(len + 1u);
    return IVTS_OK;
}
