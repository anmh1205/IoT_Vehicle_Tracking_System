/* Build: gcc -std=c11 -Wall -Wextra -Werror -pedantic tests/host/test_elm327_reply.c -o elm327_test */
#include <assert.h>
#include <stdio.h>
#include <string.h>

#include "../../components/adapter-ble-obd-nimble/src/elm327_reply.h"

static void test_reset_banner(void) {
    assert(elm327_reply_valid("ATZ\r\rELM327 v2.1\r\r>", true, true));
    assert(elm327_reply_valid("stn2120 v5.1\r>", true, true));
    assert(!elm327_reply_valid("ATZ\rOK\r>", true, true));
    assert(!elm327_reply_valid("ATZ\r?\r>", true, true));
}
static void test_config_ack(void) {
    assert(elm327_reply_valid("ATE0\rOK\r>", false, true));
    assert(elm327_reply_valid("oK\n>", false, true));
    assert(!elm327_reply_valid("ATSP0\r?\r>", false, true));
    assert(!elm327_reply_valid("ATSP0\rERROR\r>", false, true));
    assert(!elm327_reply_valid("NO DATA\r>", false, true));
    assert(!elm327_reply_valid("UNABLE TO CONNECT\r>", false, true));
    assert(!elm327_reply_valid("STOPPED\r>", false, true));
    assert(!elm327_reply_valid("CAN ERROR\r>", false, true));
    assert(!elm327_reply_valid("BUS ERROR\r>", false, true));
    assert(!elm327_reply_valid("NOT OK\r>", false, true));
    assert(!elm327_reply_valid(">", false, true));
}
static void test_response_fragmentation(void) {
    char response[64] = {0};
    strcat(response, "ATSP");
    strcat(response, "0\r");
    strcat(response, "O");
    strcat(response, "K");
    assert(!elm327_reply_valid(response, false, true)); /* No prompt yet. */
    strcat(response, "\r>");
    assert(elm327_reply_valid(response, false, true));
}
static void test_raw_response(void) {
    assert(elm327_reply_valid("41 0C 1A F8\r>", false, false));
    assert(!elm327_reply_valid("?\r>", false, false));
    assert(!elm327_reply_valid("\r\n>", false, false));
    assert(!elm327_reply_valid(NULL, false, true));
    assert(!elm327_reply_valid("OK\r", false, true));
}
int main(void) {
    test_reset_banner();
    test_config_ack();
    test_response_fragmentation();
    test_raw_response();
    puts("ELM327 AT parser: 4 groups of host scenarios passed");
    return 0;
}
