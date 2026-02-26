## III.1.7 Low Voltage Disconnect (LVD)

### Tổng Quan

**Low Voltage Disconnect (LVD)** bảo vệ ắc quy khỏi rút cạn quá mức bằng cách tự động chuyển sang pin backup khi điện áp ắc quy thấp.

### Nguyên Lý

- **Giám sát điện áp ắc quy**: Qua ADC ESP32 hoặc comparator hardware
- **Kiến trúc profile nguồn**: firmware chạy theo 2 profile độc lập (12V và 24V), không dùng chung một bộ ngưỡng
- **Bộ ngưỡng mặc định (bắt buộc)**:
  - **Profile 12V**: `LVD_cut=11.5V`, `Switch_OFF=12.0V`, `Switch_ON=12.2V`, `IGN_ON>=13.0V`, `IGN_OFF<=12.0V`
  - **Profile 24V**: `LVD_cut=23.0V`, `Switch_OFF=24.0V`, `Switch_ON=24.4V`, `IGN_ON>=26.0V`, `IGN_OFF<=24.0V`
- **Hysteresis**: Tránh dao động khi điện áp gần ngưỡng

### Logic Chuyển Nguồn

| Profile | Trạng Thái          | IGN | U_batt điều kiện | Nguồn Tracker | Sạc Pin  | Cảnh Báo |
| ------- | ------------------- | --- | ---------------- | ------------- | -------- | -------- |
| 12V     | Xe chạy bình thường | ON  | >= 13.0 V        | Ắc quy        | ✅ Có    | -        |
| 12V     | Xe đỗ bình thường   | OFF | > 12.0 V         | Ắc quy        | ❌ Không | -        |
| 12V     | Ắc quy yếu          | OFF | <= 12.0 V        | Pin 21700     | ❌ Không | ✅ Có    |
| 12V     | Ắc quy phục hồi     | OFF | >= 12.2 V        | Ắc quy        | ❌ Không | ✅ Có    |
| 24V     | Xe chạy bình thường | ON  | >= 26.0 V        | Ắc quy        | ✅ Có    | -        |
| 24V     | Xe đỗ bình thường   | OFF | > 24.0 V         | Ắc quy        | ❌ Không | -        |
| 24V     | Ắc quy yếu          | OFF | <= 24.0 V        | Pin 21700     | ❌ Không | ✅ Có    |
| 24V     | Ắc quy phục hồi     | OFF | >= 24.4 V        | Ắc quy        | ❌ Không | ✅ Có    |

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
U_batt (12V/24V) ── Voltage Divider ── ADC ESP32
                (R1=100k, R2=10k)
```

#### Tính Toán Voltage Divider (chuẩn cho cả 12V và 24V)

```
V_adc = U_batt × R2 / (R1 + R2)
      = U_batt × 10k / (100k + 10k)
      = U_batt × 0.0909

U_batt = V_adc × (R1 + R2) / R2
       = V_adc × 11

Ví dụ 12V:
V_adc = 12.0 × 0.0909 = 1.091 V
ADC_value = (1.091 / 3.3) × 4095 ≈ 1354

Ví dụ 24V:
V_adc = 24.0 × 0.0909 = 2.182 V
ADC_value = (2.182 / 3.3) × 4095 ≈ 2708
```

Điều kiện biên với profile 24V:

- 24.4V → V_adc ≈ 2.218V (< 3.3V)
- 26.0V → V_adc ≈ 2.364V (< 3.3V)

=> Tỷ lệ chia áp 100k/10k đáp ứng đo profile 12V và 24V mà không bão hòa ADC.

#### Code Ví Dụ

```c
typedef enum {
    POWER_PROFILE_12V,
    POWER_PROFILE_24V
} power_profile_t;

typedef struct {
    float lvd_cut;
    float switch_off;
    float switch_on;
    float ign_on;
    float ign_off;
} power_thresholds_t;

static const power_thresholds_t TH_12V = {
    .lvd_cut = 11.5f,
    .switch_off = 12.0f,
    .switch_on = 12.2f,
    .ign_on = 13.0f,
    .ign_off = 12.0f
};

static const power_thresholds_t TH_24V = {
    .lvd_cut = 23.0f,
    .switch_off = 24.0f,
    .switch_on = 24.4f,
    .ign_on = 26.0f,
    .ign_off = 24.0f
};

#define R1 100000.0f  // 100kΩ
#define R2 10000.0f   // 10kΩ
#define ADC_MAX 4095.0f
#define VREF 3.3f

static inline const power_thresholds_t* get_thresholds(power_profile_t p) {
    return (p == POWER_PROFILE_24V) ? &TH_24V : &TH_12V;
}

float read_battery_voltage(void) {
    int adc_value = adc1_get_raw(ADC1_CHANNEL_4);
    float v_adc = ((float)adc_value / ADC_MAX) * VREF;
    return v_adc * ((R1 + R2) / R2);  // nhân 11 lần
}

void check_lvd(power_profile_t profile) {
    const power_thresholds_t* th = get_thresholds(profile);
    float u_batt = read_battery_voltage();
    static bool using_backup = false;

    if (!using_backup && u_batt <= th->switch_off) {
        select_backup_power();
        using_backup = true;
        send_alert("LVD switch-off: moved to backup");
    } else if (using_backup && u_batt >= th->switch_on) {
        select_battery_power();
        using_backup = false;
        send_alert("Battery recovered: moved to vehicle battery");
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
U_batt ── Voltage Divider (R1=100k, R2=10k) ── LM393 (-)
                                                       │
Reference (switchable theo profile 12V/24V) ───────── LM393 (+)
                                                       │
                                                       └── GPIO ESP32
```

#### Tính Toán

- Voltage divider: R1 = 100 kΩ, R2 = 10 kΩ
- V_ref = U_batt × R2/(R1+R2) = U_batt × 0.0909
- Profile 12V: `Switch_OFF=12.0V` → V_ref ≈ 1.091V
- Profile 24V: `Switch_OFF=24.0V` → V_ref ≈ 2.182V
- Comparator reference cần theo profile (hoặc tạo bằng DAC/PWM + RC)

#### Hysteresis

- R3, R4 feedback để tạo hysteresis
- Profile 12V: 12.0 V (OFF) → 12.2 V (ON)
- Profile 24V: 24.0 V (OFF) → 24.4 V (ON)
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
