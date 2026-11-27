#include <assert.h>
#include <errno.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>
#include "esp_timer.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"
#include "freertos/task.h"
#include "ivts_core/base/crc32.h"
#include "platform/platform.h"
#include "queue/queue.h"

#define LEGACY_CURSOR Q_DIR "/CURSOR.BIN"
#define LEGACY_MAGIC UINT32_C(0x51435552)
#define FRAME_BYTES (1u + FRAME_OVERHEAD)

typedef enum {
    NO_FAULT, CUT_AT_OPEN, CUT_AT_TORN_WRITE, CUT_AT_BUFFERED_WRITE, CUT_AT_FLUSH, CUT_AT_SYNC, CUT_AT_CLOSE,
    SHORT_WRITE, FAIL_CLOSE, FAIL_READ,
} fault_t;

static fault_t s_fault;
static FILE *s_checkpoint_stream;
static bool s_fail_mutex, s_locked;
static unsigned s_queued, s_mount_errors;
static char s_request_queue;

platform_mutex_t platform_mutex_create(void)
{
    return s_fail_mutex ? NULL : (platform_mutex_t)&s_locked;
}

void platform_mutex_lock(platform_mutex_t mutex)
{
    assert(mutex != NULL && !s_locked);
    s_locked = true;
}

void platform_mutex_unlock(platform_mutex_t mutex)
{
    assert(mutex != NULL && s_locked);
    s_locked = false;
}

int64_t esp_timer_get_time(void) { return 0; }
esp_err_t storage_nvs_init(void) { return ESP_OK; }
esp_err_t storage_sd_mount(void) { return ESP_OK; }
const char *esp_err_to_name(esp_err_t error) { (void)error; return "host fixture"; }

ivts_err_t storage_sd_log_write(const char *line, size_t len)
{
    (void)line;
    (void)len;
    abort();
}

QueueHandle_t xQueueCreate(unsigned length, unsigned item_size)
{
    assert(length > 0u && item_size > 0u);
    return &s_request_queue;
}

int xQueueSend(QueueHandle_t queue, const void *item, unsigned ticks)
{
    assert(queue == &s_request_queue && item != NULL && ticks == 0u);
    s_queued++;
    return pdTRUE;
}

int xQueueReceive(QueueHandle_t queue, void *item, unsigned ticks)
{
    (void)queue;
    (void)item;
    (void)ticks;
    abort();
}

int xTaskCreate(void (*task)(void *), const char *name, unsigned stack,
                void *arg, unsigned prio, void *handle)
{
    assert(task != NULL && strcmp(name, "storage") == 0 && stack > 0u);
    (void)arg;
    (void)prio;
    (void)handle;
    return pdPASS;
}

static ivts_err_t on_storage_event(void *ctx, const ivts_event_t *event)
{
    (void)ctx;
    if (event->type == IVTS_EV_STORE_RESULT) {
        assert(event->u.store_result.op == IVTS_STORE_OP_SD_MOUNT);
        s_mount_errors++;
    } else {
        assert(event->type == IVTS_EV_QUEUE_READY);
    }
    return IVTS_OK;
}

static void init_storage(void)
{
    assert(mkdir(SD_MOUNT, 0700) == 0);
    storage_cfg_t config = {
        .sink = { .fn = on_storage_event },
        .sd_enabled = true,
        .queue_segment_bytes = 3u * (IVTS_RECORD_MAX_SIZE + FRAME_OVERHEAD),
        .queue_max_segments = 2,
        .task_stack = 2048,
        .req_queue_len = 2,
    };
    assert(storage_init(&config) == IVTS_OK);
}

FILE *__real_fopen(const char *path, const char *mode);
size_t __real_fwrite(const void *ptr, size_t size, size_t count, FILE *file);
int __real_fflush(FILE *file);
int __real_fsync(int fd);
int __real_fclose(FILE *file);

static void cut_power(void)
{
    _Exit(77);  /* Bypass stdio cleanup, as a reset does. */
}

FILE *__wrap_fopen(const char *path, const char *mode)
{
    const char *prefix = Q_DIR "/CURSOR";
    bool checkpoint = strncmp(path, prefix, strlen(prefix)) == 0;
    bool writing = strchr(mode, 'w') != NULL || strchr(mode, '+') != NULL;
    if (checkpoint && !writing && s_fault == FAIL_READ) {
        errno = EIO;
        return NULL;
    }
    FILE *file = __real_fopen(path, mode);
    if (checkpoint && writing && file != NULL) {
        s_checkpoint_stream = file;
        if (s_fault == CUT_AT_OPEN) { cut_power(); }
    }
    return file;
}

size_t __wrap_fwrite(const void *ptr, size_t size, size_t count, FILE *file)
{
    if (file == s_checkpoint_stream && (s_fault == CUT_AT_TORN_WRITE || s_fault == SHORT_WRITE)) {
        size_t written = __real_fwrite(ptr, size, count / 2u, file);
        if (s_fault == CUT_AT_TORN_WRITE) {
            assert(__real_fflush(file) == 0 && __real_fsync(fileno(file)) == 0);
            cut_power();
        }
        return written;
    }
    size_t written = __real_fwrite(ptr, size, count, file);
    if (file == s_checkpoint_stream && s_fault == CUT_AT_BUFFERED_WRITE) { cut_power(); }
    return written;
}

int __wrap_fflush(FILE *file)
{
    int result = __real_fflush(file);
    if (file != NULL && file == s_checkpoint_stream && s_fault == CUT_AT_FLUSH) {
        assert(result == 0);
        cut_power();
    }
    return result;
}

int __wrap_fsync(int fd)
{
    int result = __real_fsync(fd);
    if (s_checkpoint_stream != NULL && fd == fileno(s_checkpoint_stream) && s_fault == CUT_AT_SYNC) {
        assert(result == 0);
        cut_power();
    }
    return result;
}

int __wrap_fclose(FILE *file)
{
    bool checkpoint = file == s_checkpoint_stream;
    if (checkpoint) { s_checkpoint_stream = NULL; }
    int result = __real_fclose(file);
    if (checkpoint && s_fault == CUT_AT_CLOSE) {
        assert(result == 0);
        cut_power();
    }
    if (checkpoint && s_fault == FAIL_CLOSE) {
        assert(result == 0);
        errno = EIO;
        return EOF;
    }
    return result;
}

static void push(uint8_t value)
{
    assert(storage_queue_do_push(&value, sizeof value) == IVTS_OK);
}

static uint32_t peek(uint8_t expected)
{
    uint8_t value;
    uint32_t token;
    size_t length;
    assert(storage_queue_do_peek() == IVTS_OK);
    assert(storage_queue_peek_copy(&value, sizeof value, &length, &token) == IVTS_OK);
    assert(length == sizeof value && value == expected && token != 0u);
    return token;
}

static void pop(uint8_t value)
{
    assert(storage_queue_do_pop(peek(value)) == IVTS_OK);
}

static uint32_t recovered_offset(uint32_t max_pending)
{
    storage_queue_state_t recovered = {0};
    assert(storage_queue_open_state(&recovered) == ESP_OK);
    assert(storage_queue_count() <= max_pending && recovered.read_segment == 0u);
    return recovered.read_offset;
}

static void cut_during_pop(fault_t fault, uint8_t value)
{
    pid_t child = fork();
    assert(child >= 0);
    if (child == 0) {
        s_fault = fault;
        pop(value);
        _Exit(1);
    }
    int status;
    assert(waitpid(child, &status, 0) == child);
    assert(WIFEXITED(status) && WEXITSTATUS(status) == 77);
}

static void check_interrupted_checkpoint(fault_t stage)
{
    init_storage();
    push(1);
    pop(1);
    push(2);
    pop(2);
    assert(recovered_offset(0u) == 2u * FRAME_BYTES);
    push(3);
    cut_during_pop(stage, 3);
    uint32_t offset = recovered_offset(1u);
    assert(offset == 2u * FRAME_BYTES || offset == 3u * FRAME_BYTES);
    if (stage == CUT_AT_OPEN || stage == CUT_AT_TORN_WRITE) { assert(offset == 2u * FRAME_BYTES); }
    if (stage == CUT_AT_SYNC || stage == CUT_AT_CLOSE) { assert(offset == 3u * FRAME_BYTES); }
    assert(storage_queue_open() == ESP_OK);
    if (offset == 2u * FRAME_BYTES) { pop(3); }
    assert(storage_queue_count() == 0u);
}

static void write_legacy_cursor(bool corrupt)
{
    uint32_t legacy[] = { LEGACY_MAGIC, 0u, FRAME_BYTES, 0u };
    legacy[3] = ivts_crc32(0, legacy, 3u * sizeof legacy[0]);
    if (corrupt) { legacy[3] ^= 1u; }
    FILE *file = fopen(LEGACY_CURSOR, "wb");
    assert(file != NULL && fwrite(legacy, 1, sizeof legacy, file) == sizeof legacy);
    assert(fclose(file) == 0);
}

static void check_legacy_upgrade(void)
{
    init_storage();
    push(1);
    push(2);
    write_legacy_cursor(false);
    assert(storage_queue_open() == ESP_OK && storage_queue_count() == 1u);
    cut_during_pop(CUT_AT_TORN_WRITE, 2);
    assert(recovered_offset(1u) == FRAME_BYTES);
    assert(storage_queue_open() == ESP_OK);
    pop(2);
    assert(recovered_offset(0u) == 2u * FRAME_BYTES);
}

static void check_corrupt_checkpoint(void)
{
    init_storage();
    push(1);
    write_legacy_cursor(true);
    cut_during_pop(CUT_AT_TORN_WRITE, 1);
    assert(recovered_offset(1u) == 0u && storage_queue_count() == 1u);
}

static void check_retry(void)
{
    init_storage();
    push(1);
    pop(1);
    push(2);
    s_fault = SHORT_WRITE;
    pop(2);
    s_fault = NO_FAULT;
    storage_queue_state_t persisted = {0};
    assert(storage_queue_cursor_load(&persisted) == ESP_OK && persisted.read_offset == FRAME_BYTES);
    assert(storage_queue_count() == 0u);
    push(3);
    cut_during_pop(CUT_AT_TORN_WRITE, 3);
    assert(storage_queue_cursor_load(&persisted) == ESP_OK && persisted.read_offset == FRAME_BYTES);
    uint32_t token = peek(3);
    assert(storage_queue_do_pop(token) == IVTS_OK);
    assert(storage_queue_do_pop(token) == IVTS_ERR_NOT_FOUND);
    assert(recovered_offset(0u) == 3u * FRAME_BYTES);
}

static void check_read_error(void)
{
    init_storage();
    push(1);
    pop(1);
    s_fault = FAIL_READ;
    assert(storage_queue_open() == ESP_FAIL);
    s_fault = NO_FAULT;
    assert(recovered_offset(0u) == FRAME_BYTES);
}

static void check_close_error(void)
{
    init_storage();
    push(1);
    pop(1);
    push(2);
    s_fault = FAIL_CLOSE;
    pop(2);
    s_fault = NO_FAULT;
    push(3);
    cut_during_pop(CUT_AT_TORN_WRITE, 3);
    assert(recovered_offset(1u) == 2u * FRAME_BYTES);
}

static void check_degraded_storage(void)
{
    s_fail_mutex = true;
    init_storage();
    assert(!storage_sd_ok() && s_mount_errors == 1u && storage_queue_count() == 0u);
    uint32_t token;
    uint8_t record;
    size_t length;
    assert(storage_queue_peek_copy(&record, sizeof record, &length, &token) == IVTS_ERR_INVALID_ARG);
    assert(storage_queue_request_peek() == IVTS_ERR_INVALID_STATE);
    assert(storage_queue_pop(1u) == IVTS_ERR_INVALID_ARG && s_queued == 0u);
    assert(storage_queue_do_pop(1u) == IVTS_ERR_INVALID_ARG);
}

int main(int argc, char **argv)
{
    assert(argc == 2);
    const char *name = argv[1];
    if (strcmp(name, "legacy") == 0) { check_legacy_upgrade(); }
    else if (strcmp(name, "corrupt") == 0) { check_corrupt_checkpoint(); }
    else if (strcmp(name, "retry") == 0) { check_retry(); }
    else if (strcmp(name, "close_error") == 0) { check_close_error(); }
    else if (strcmp(name, "read_error") == 0) { check_read_error(); }
    else if (strcmp(name, "degraded") == 0) { check_degraded_storage(); }
    else {
        const char *stages[] = { "open", "torn_write", "buffered_write", "flush", "sync", "close" };
        for (unsigned i = 0; i < sizeof stages / sizeof stages[0]; i++) {
            if (strcmp(name, stages[i]) == 0) {
                check_interrupted_checkpoint((fault_t)(CUT_AT_OPEN + i));
                return 0;
            }
        }
        abort();
    }
    return 0;
}
