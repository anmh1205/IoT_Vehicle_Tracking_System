#include <assert.h>
#include <string.h>

#include "board_internal.h"
#include "drivers/drivers.h"
#include "drivers/drivers_calc.h"

#define CALENDAR_REG 0x00u
#define STATUS_REG 0x0fu
#define OLD_TIME_MS UINT64_C(1704067200000)
#define NEW_TIME_MS UINT64_C(1767225600000)

static uint8_t s_calendar[7];
static uint8_t s_status;
static bool s_bus_locked;
static unsigned s_fail_transfer;
static void (*s_after_calendar_read)(void);
static void (*s_after_calendar_write)(void);
static ivts_err_t s_interleaved_result;

bool board_rtc_ok(void) { return true; }
bool board_i2c_probe(uint16_t address) { return address == 0x68u; }

esp_err_t board_i2c_add(board_dev_t device, uint16_t address, uint32_t speed_hz)
{
    assert(device == BOARD_DEV_RTC && address == 0x68u && speed_hz == 100000u);
    return ESP_OK;
}

const char *esp_err_to_name(esp_err_t error)
{
    (void)error;
    return "fixture error";
}

bool board_i2c_lock(void)
{
    /* Model the second task waiting until its lock deadline while the first task is paused. */
    if (s_bus_locked) { return false; }
    s_bus_locked = true;
    return true;
}

void board_i2c_unlock(void)
{
    assert(s_bus_locked);
    s_bus_locked = false;
}

static bool should_fail_transfer(void)
{
    return s_fail_transfer != 0u && --s_fail_transfer == 0u;
}

static void run_interleaved(void (**hook)(void))
{
    if (*hook == NULL) { return; }
    void (*run)(void) = *hook;
    *hook = NULL;
    run();
}

static esp_err_t read_registers(uint8_t reg, uint8_t *data, size_t len)
{
    if (should_fail_transfer()) { return ESP_FAIL; }
    if (reg == CALENDAR_REG) {
        assert(len == sizeof s_calendar);
        memcpy(data, s_calendar, len);
    } else {
        assert(reg == STATUS_REG && len == 1u);
        *data = s_status;
    }
    return ESP_OK;
}

static esp_err_t write_registers(uint8_t reg, const uint8_t *data, size_t len)
{
    if (should_fail_transfer()) { return ESP_FAIL; }
    if (reg == CALENDAR_REG) {
        assert(len == sizeof s_calendar);
        memcpy(s_calendar, data, len);
    } else {
        assert(reg == STATUS_REG && len == 1u);
        s_status = *data;
    }
    return ESP_OK;
}

esp_err_t board_i2c_read_locked(board_dev_t device, uint8_t reg, uint8_t *data, size_t len)
{
    assert(device == BOARD_DEV_RTC && s_bus_locked);
    esp_err_t result = read_registers(reg, data, len);
    if (reg == CALENDAR_REG && result == ESP_OK) { run_interleaved(&s_after_calendar_read); }
    return result;
}

esp_err_t board_i2c_write_locked(board_dev_t device, uint8_t reg, const uint8_t *data, size_t len)
{
    assert(device == BOARD_DEV_RTC && s_bus_locked);
    esp_err_t result = write_registers(reg, data, len);
    if (reg == CALENDAR_REG && result == ESP_OK) { run_interleaved(&s_after_calendar_write); }
    return result;
}

esp_err_t board_i2c_read(board_dev_t device, uint8_t reg, uint8_t *data, size_t len)
{
    assert(device == BOARD_DEV_RTC);
    if (!board_i2c_lock()) { return ESP_ERR_TIMEOUT; }
    esp_err_t result = read_registers(reg, data, len);
    board_i2c_unlock();
    if (reg == CALENDAR_REG && result == ESP_OK) { run_interleaved(&s_after_calendar_read); }
    return result;
}

esp_err_t board_i2c_write(board_dev_t device, uint8_t reg, const uint8_t *data, size_t len)
{
    assert(device == BOARD_DEV_RTC);
    if (!board_i2c_lock()) { return ESP_ERR_TIMEOUT; }
    esp_err_t result = write_registers(reg, data, len);
    board_i2c_unlock();
    if (reg == CALENDAR_REG && result == ESP_OK) { run_interleaved(&s_after_calendar_write); }
    return result;
}

static void sync_from_gnss(void)
{
    s_interleaved_result = board_time_set(NEW_TIME_MS);
}

static void read_for_modem(void)
{
    uint64_t unix_ms = 1u;
    bool trusted = true;
    s_interleaved_result = board_time_get(&unix_ms, &trusted);
    if (s_interleaved_result != IVTS_OK) { assert(unix_ms == 1u && trusted); }
}

static void check_synchronized_clock(void)
{
    uint64_t unix_ms;
    bool trusted;
    assert(!s_bus_locked);
    assert(board_time_get(&unix_ms, &trusted) == IVTS_OK);
    assert(unix_ms == NEW_TIME_MS && trusted);
}

static void check_sync_during_read(void)
{
    s_after_calendar_read = sync_from_gnss;
    uint64_t unix_ms;
    bool trusted;
    assert(board_time_get(&unix_ms, &trusted) == IVTS_OK);
    assert(unix_ms == OLD_TIME_MS && !trusted);
    assert(s_interleaved_result == IVTS_ERR_TIMEOUT);
    assert(board_time_set(NEW_TIME_MS) == IVTS_OK);
    check_synchronized_clock();
}

static void check_read_during_sync(void)
{
    s_after_calendar_write = read_for_modem;
    assert(board_time_set(NEW_TIME_MS) == IVTS_OK);
    assert(s_interleaved_result == IVTS_ERR_TIMEOUT);
    check_synchronized_clock();
}

static void check_transfer_failure(void)
{
    for (unsigned transfer = 1u; transfer <= 2u; transfer++) {
        uint64_t unix_ms = 1u;
        bool trusted = true;
        s_fail_transfer = transfer;
        assert(board_time_get(&unix_ms, &trusted) == IVTS_ERR_IO);
        assert(!s_bus_locked && unix_ms == 1u && trusted);
    }
    for (unsigned transfer = 1u; transfer <= 3u; transfer++) {
        uint64_t unix_ms;
        bool trusted;
        s_fail_transfer = transfer;
        assert(board_time_set(NEW_TIME_MS) == IVTS_ERR_IO);
        assert(!s_bus_locked);
        assert(board_time_get(&unix_ms, &trusted) == IVTS_OK);
        assert(unix_ms == (transfer == 1u ? OLD_TIME_MS : NEW_TIME_MS) && !trusted);
    }
    assert(board_time_set(NEW_TIME_MS) == IVTS_OK);
    check_synchronized_clock();
}

int main(int argc, char **argv)
{
    assert(argc == 2);
    assert(ds3231_init(BOARD_DEV_RTC, 0x68u, 100000u) == ESP_OK);
    assert(ds3231_encode_time(OLD_TIME_MS, s_calendar) == IVTS_OK);
    s_status = DS3231_OSF;
    if (strcmp(argv[1], "sync_during_read") == 0) { check_sync_during_read(); }
    else if (strcmp(argv[1], "read_during_sync") == 0) { check_read_during_sync(); }
    else {
        assert(strcmp(argv[1], "transfer_failure") == 0);
        check_transfer_failure();
    }
    return 0;
}
