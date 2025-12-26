## PHẦN V.7.10: TROUBLESHOOTING

### V.7.10 Troubleshooting

#### V.7.10.1 Common Issues

**1. Connection Timeout:**

```
Problem: Không kết nối được sau 10 giây
Solutions:
- Kiểm tra vgate iCar Pro đã bật chưa
- Kiểm tra BLE address có đúng không
- Tăng timeout: ble_mgr_connect_service(..., 30000U, ...)
- Kiểm tra service UUID: 0x18F0
```

**2. No Response:**

```
Problem: Gửi command nhưng không nhận response
Solutions:
- Kiểm tra đã enable notify chưa (CCCD)
- Kiểm tra command format: "MMPP\r" (có \r)
- Kiểm tra timeout: tăng timeout_ms
- Kiểm tra connection state: ble_obd_is_connected()
```

**3. Invalid Response:**

```
Problem: Response không đúng format
Solutions:
- Kiểm tra parsing logic
- Log raw response để debug
- Kiểm tra response có đầy đủ không (multiple packets)
- Validate response: mode + 0x40, PID match
```

**4. Disconnection:**

```
Problem: Bị disconnect giữa chừng
Solutions:
- Implement reconnection logic
- Kiểm tra connection parameters (supervision timeout)
- Kiểm tra power management (không deep sleep khi connected)
- Handle disconnect callback
```

---

