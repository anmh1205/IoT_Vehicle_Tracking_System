#pragma once
#include <deque>
#include <stdint.h>

struct can_frame {
  uint32_t can_id;
  uint8_t can_dlc;
  uint8_t data[8];
};

struct MCP2515 {
  enum ERROR { ERROR_OK, ERROR_FAIL, ERROR_NOMSG };
  std::deque<can_frame> rx;
  std::deque<can_frame> tx;
  bool send_blocked = false;

  ERROR sendMessage(const can_frame *frame) {
    if (send_blocked) {
      return ERROR_FAIL;
    }
    tx.push_back(*frame);
    return ERROR_OK;
  }
  ERROR readMessage(can_frame *frame) {
    if (rx.empty()) {
      return ERROR_NOMSG;
    }
    *frame = rx.front();
    rx.pop_front();
    return ERROR_OK;
  }
};
