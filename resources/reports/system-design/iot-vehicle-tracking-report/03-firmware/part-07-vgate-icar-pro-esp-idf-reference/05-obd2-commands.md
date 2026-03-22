## PHẦN V.7.6: OBD2 COMMANDS VÀ RESPONSES

### V.7.6 OBD2 Commands và Responses

#### V.7.6.1 Command Format

**Standard OBD2 Command:**

```
Format: "MMPP\r"
- MM: Mode (2 hex digits)
- PP: PID (2 hex digits)
- \r: Carriage return (required)

Examples:
- "010C\r" - Mode 0x01 (Current Data), PID 0x0C (RPM)
- "010D\r" - Mode 0x01, PID 0x0D (Speed)
- "0104\r" - Mode 0x01, PID 0x04 (Engine Load)
```

**ELM327 AT Commands (nếu hỗ trợ):**

```
- "ATZ\r"     - Reset adapter
- "ATE0\r"    - Echo off
- "ATL0\r"    - Linefeeds off
- "ATS0\r"    - Spaces off
- "ATH0\r"    - Headers off
- "ATSP0\r"   - Set protocol to Auto
```

#### V.7.6.2 Response Format

**Standard OBD2 Response:**

```
Format: "MM PP DD DD ...\r"
- MM: Mode + 0x40 (response indicator)
- PP: PID (echo of request)
- DD: Data bytes (hex, space-separated)
- \r: Carriage return

Example:
Request:  "010C\r"
Response: "41 0C 1F 40\r"
          └─┬─┘ └──┬──┘
            │      └─ Data: 0x1F40 = 8000 (RPM = 8000/4 = 2000)
            └─ Mode 0x41 (0x01 + 0x40), PID 0x0C
```

**Error Response:**

```
"?\r" - Error (invalid command, no data, etc.)
```

**Prompt:**

```
">\r" - Ready for next command
```

#### V.7.6.3 Common OBD2 PIDs

| PID  | Description             | Data Length | Formula               | Unit |
| ---- | ----------------------- | ----------- | --------------------- | ---- |
| 0x0C | Engine RPM              | 2 bytes     | (A \* 256 + B) / 4    | RPM  |
| 0x0D | Vehicle Speed           | 1 byte      | A                     | km/h |
| 0x04 | Engine Load             | 1 byte      | (A \* 100) / 255      | %    |
| 0x05 | Coolant Temperature     | 1 byte      | A - 40                | °C   |
| 0x0F | Intake Air Temperature  | 1 byte      | A - 40                | °C   |
| 0x11 | Throttle Position       | 1 byte      | (A \* 100) / 255      | %    |
| 0x2F | Fuel Level              | 1 byte      | (A \* 100) / 255      | %    |
| 0x42 | Control Module Voltage  | 2 bytes     | (A \* 256 + B) / 1000 | V    |
| 0x46 | Ambient Air Temperature | 1 byte      | A - 40                | °C   |
| 0x5C | Engine Oil Temperature  | 1 byte      | A - 40                | °C   |

---

