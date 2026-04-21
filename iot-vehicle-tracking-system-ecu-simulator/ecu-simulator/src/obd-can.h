#pragma once

#include <Arduino.h>
#include <mcp2515.h>

void obd_can_begin(MCP2515 &can_controller);
void obd_can_poll();
