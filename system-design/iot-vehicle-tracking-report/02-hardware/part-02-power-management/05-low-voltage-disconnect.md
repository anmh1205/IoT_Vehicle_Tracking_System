## III.1.7 Low Voltage Disconnect (LVD)

### Tổng Quan

**Low Voltage Disconnect (LVD)** bảo vệ ắc quy khỏi rút cạn quá mức bằng cách tự động chuyển sang pin backup khi điện áp ắc quy thấp.

### Nguyên Lý

- **Giám sát điện áp ắc quy**: Qua ADC ESP32 hoặc comparator hardware
- **Ngưỡng**: 12.0 V (OFF) → 12.2 V (ON)
- **Hysteresis**: Tránh dao động khi điện áp gần ngưỡng

### Logic Chuyển Nguồn

| Trạng Thái          | IGN | U_batt   | Nguồn Tracker | Sạc Pin  | Cảnh Báo |
| ------------------- | --- | -------- | ------------- | -------- | -------- |
| Xe chạy bình thường | ON  | > 12 V   | Ắc quy        | ✅ Có    | -        |
| Xe đỗ bình thường   | OFF | > 12 V   | Ắc quy        | ❌ Không | -        |
| Ắc quy yếu          | OFF | < 12 V   | Pin 21700     | ❌ Không | ✅ Có    |
| Ắc quy phục hồi     | OFF | > 12.2 V | Ắc quy        | ❌ Không | ✅ Có    |

### Giải Pháp 1: Software-based (ADC ESP32) - Khuyến nghị

#### Ưu Điểm

- ✅ **Đơn giản**: Không cần linh kiện ngoài
- ✅ **Linh hoạt**: Có thể điều chỉnh ngưỡng trong firmware
- ✅ **Chi phí**: Miễn phí (đã có ADC trong ESP32)
- ✅ **Hysteresis**: Dễ implement trong firmware

#### Nhược Điểm

- ⚠️ **Tốc độ**: Chậm hơn hardware (nhưng đủ cho ứng dụng này)
- ⚠️ **Độ chính xác**: Phụ thuộc vào ADC ESP32 (12-bit, đủ chính xác)

#### Sơ Đồ Kết Nối

```
U_batt (12V) ── Voltage Divider ── ADC ESP32
                (R1=10k, R2=2.2k)
```

#### Tính Toán Voltage Divider

```
V_adc = U_batt × R2 / (R1 + R2)
      = U_batt × 2.2k / (10k + 2.2k)
      = U_batt × 0.18

Khi U_batt = 12V:
V_adc = 12V × 0.18 = 2.16V

ADC ESP32 (12-bit, 0-3.3V):
ADC_value = (2.16V / 3.3V) × 4095 = 2680
```

#### Code Ví Dụ

```c
#define R1 10000  // 10kΩ
#define R2 2200   // 2.2kΩ
#define ADC_MAX 4095
#define VREF 3.3

float read_battery_voltage() {
    int adc_value = adc1_get_raw(ADC1_CHANNEL_4);
    float v_adc = (adc_value / (float)ADC_MAX) * VREF;
    float u_batt = v_adc * (R1 + R2) / R2;
    return u_batt;
}

void check_lvd() {
    float u_batt = read_battery_voltage();

    static bool using_backup = false;

    if (u_batt < 12.0 && !using_backup) {
        // Chuyển sang pin
        select_backup_power();
        using_backup = true;
        send_alert("Low battery - switched to backup");
    } else if (u_batt > 12.2 && using_backup) {
        // Chuyển lại ắc quy
        select_battery_power();
        using_backup = false;
        send_alert("Battery recovered - switched back");
    }
}
```

### Giải Pháp 2: Hardware-based (LM393 Comparator)

#### Ưu Điểm

- ✅ **Tốc độ**: Nhanh (hardware)
- ✅ **Độ chính xác**: Tốt (comparator + reference)

#### Nhược Điểm

- ⚠️ **Chi phí**: ~10,000 VNĐ (IC + linh kiện)
- ⚠️ **Phức tạp**: Cần thiết kế mạch
- ⚠️ **Ít linh hoạt**: Ngưỡng cố định (có thể điều chỉnh bằng resistor)

#### Sơ Đồ

```
U_batt ── Voltage Divider (R1=10k, R2=2.2k) ── LM393 (-)
                                                      │
Reference (TL431, 2.16V) ─────────────────────────── LM393 (+)
                                                      │
                                                      └── GPIO ESP32
```

#### Tính Toán

- Voltage divider: R1 = 10 kΩ, R2 = 2.2 kΩ
- V_ref = U_batt × R2/(R1+R2) = U_batt × 0.18
- Khi U_batt = 12 V → V_ref = 2.16 V
- Comparator reference: 2.16 V (TL431)

#### Hysteresis

- R3, R4 feedback để tạo hysteresis
- 12.0 V (OFF) → 12.2 V (ON)
- Tránh dao động khi điện áp gần ngưỡng

### So Sánh

| Tiêu Chí         | ADC ESP32 (Software)           | LM393 (Hardware)  |
| ---------------- | ------------------------------ | ----------------- |
| **Độ phức tạp**  | ⭐⭐⭐⭐⭐ (Đơn giản)          | ⭐⭐⭐ (Phức tạp) |
| **Chi phí**      | Miễn phí                       | ~10,000 VNĐ       |
| **Tốc độ**       | Chậm hơn (nhưng đủ)            | Nhanh             |
| **Độ chính xác** | ⭐⭐⭐⭐ (12-bit ADC)          | ⭐⭐⭐⭐⭐        |
| **Linh hoạt**    | ⭐⭐⭐⭐⭐ (Có thể điều chỉnh) | ⭐⭐⭐ (Cố định)  |

### Khuyến Nghị cho Đồ Án

**Sử dụng ADC ESP32 (Software-based)**

**Lý do:**

- ✅ Đơn giản, không cần linh kiện ngoài
- ✅ Linh hoạt, dễ điều chỉnh
- ✅ Chi phí = 0
- ✅ Đủ chính xác cho ứng dụng này

**Khi nào dùng Hardware:**

- Cần tốc độ phản ứng nhanh (ví dụ: bảo vệ thiết bị khác)
- Cần độ chính xác cao hơn
- ESP32 không có ADC (không áp dụng ở đây)

### Nơi Mua Hàng (Nếu dùng Hardware)

#### Trên Shopee/Lazada VN:

- Tìm: "LM393 IC", "comparator IC", "TL431 IC"
- Giá: ~3,000–8,000 VNĐ (IC) + linh kiện phụ trợ

### Tài Liệu Tham Khảo

- **ESP32 ADC**: ESP32 Technical Reference Manual
- **LM393**: LM393 Datasheet
- **TL431**: TL431 Datasheet

### Kết Luận

**Khuyến nghị cho đồ án:**

- ✅ Dùng **ADC ESP32 (Software-based)** - đơn giản, đủ chính xác
- ⚠️ Chỉ dùng **LM393 (Hardware)** nếu có yêu cầu đặc biệt

**Lưu ý:** Software-based đủ cho ứng dụng này và đơn giản hơn nhiều.
