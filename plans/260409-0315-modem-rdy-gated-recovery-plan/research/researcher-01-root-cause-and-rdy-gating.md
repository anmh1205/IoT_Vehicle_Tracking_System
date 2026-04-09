# Research Report: Root Cause and RDY Gating

## Findings
- Cả 2 log đều cho thấy modem **không sẵn sàng tại thời điểm AT sync**: sau power-on, firmware vào `WAIT_BOOT` rồi thử AT sau ~7.5s từ lúc PWRKEY pulse end (1211 -> 8711 ms).
- AT probe ban đầu luôn timeout; firmware sau đó **fallback quá sớm** sang `RESET`, rồi `PWRKEY`, rồi `RECOVER_RESET`, tạo thành vòng lặp reset/power-cycle dày đặc.
- Trong log `after_hw_fix`, có các dấu hiệu **UART/line vẫn còn đang chuyển trạng thái** ngay sau fallback: `AT.` / `)U.` / `.U.` / `CT.` → không phải phản hồi AT hợp lệ, nhiều khả năng là noise/boot chatter/half-byte do modem chưa ổn định.
- Mốc thời gian đáng chú ý:
  - Power-on pulse đầu tiên: 700–1210 ms.
  - Vào AT_SYNC lần đầu: ~8710 ms.
  - Fallback RESET đầu tiên: 14410 ms; tức chỉ ~3.7s sau khi bắt đầu AT sync.
  - Fallback PWRKEY tiếp theo: 26610 ms.
  - Power-cycle recover: 38810 ms.
- Log không có đoạn nào cho thấy firmware **đợi RDY thật sự** trước khi gửi AT/CPIN; do đó current recovery path dựa trên timeout hơn là modem-ready signal.

## Hypotheses ranked
1. **[Cao nhất] Gating sai thời điểm: gửi AT khi modem chưa qua boot-ready window**
   - SIM7600 có thể đang boot hoặc đang đổi trạng thái sau PWRKEY/RESET.
   - Timeout của AT bị hiểu nhầm là modem chết, dẫn đến reset/pwrkey lặp.
2. **[Cao] RDY/boot signal chưa được dùng làm điều kiện mở cổng AT**
   - Nếu RDY tồn tại nhưng không được chờ, firmware sẽ probe sớm hơn khả năng modem trả lời.
   - Dấu hiệu `AT.`/rác serial hỗ trợ giả thuyết này.
3. **[Trung bình] UART config không phải root-cause chính, nhưng làm nhiễu chẩn đoán**
   - Log `fixed UART` và `probe config` đều timeout; tức vấn đề không chỉ là baud/invert.
   - Tuy nhiên nếu line đang float/boot chatter, probe logic càng dễ kết luận sai.
4. **[Trung bình-thấp] CPIN/CME error là hậu quả của attach state chưa sẵn sàng, không phải lỗi SIM thật**
   - Khi modem chưa ready hoặc chưa registered, lệnh kiểm tra SIM có thể trả `+CME ERROR: SIM not inserted`/tương tự theo trạng thái nội bộ chưa ổn định.
   - Nên coi đây là tín hiệu “chưa vào trạng thái AT hợp lệ”, không phải bằng chứng SIM vật lý hỏng, trừ khi lặp lại sau khi RDY đã xác nhận.

## Recommended gating rules
- **Không gửi AT/CPIN cho tới khi RDY đã xác nhận ổn định** trong một cửa sổ thời gian tối thiểu sau boot/pulse.
- **RDY phải là gate mở đầu cho AT_SYNC**; timeout AT không được tự động kích RESET nếu RDY chưa từng thấy.
- **Tách 3 trạng thái rõ ràng**:
  1. `BOOTING` — sau PWRKEY/RESET, chỉ chờ RDY.
  2. `READY_FOR_AT` — chỉ từ đây mới probe AT, sau đó mới CPIN.
  3. `RECOVERABLE_FAILURE` — chỉ vào reset/power-cycle nếu đã có RDY nhưng AT vẫn fail lặp lại.
- **Quy tắc tối thiểu**:
  - Không fallback reset/pwrkey trước khi hết một boot window cố định sau PWRKEY/RESET.
  - Nếu chưa thấy RDY, **retry wait**, không reset.
  - Chỉ cho CPIN chạy sau khi AT `OK` tối thiểu 1 lần.
- **Chống loop reset**:
  - Giới hạn số lần recover liên tiếp nếu chưa thấy RDY.
  - Nếu nhiều lần không có RDY, chuyển sang trạng thái “hardware fault / wait longer” thay vì tiếp tục power-cycle.

## Evidence mapping (log / LA)
- `after_hw_fix`:
  - `701 ms` PWRKEY begin, `1211 ms` PWRKEY end.
  - `8711 ms` vào `AT_SYNC` lần đầu.
  - `10611–38431 ms`: quét UART nhiều cấu hình, toàn timeout; chỉ có `AT.` lẻ tẻ.
  - `44171 ms`: fallback RESET.
  - `56401 ms`: fallback PWRKEY.
  - `68631 ms`, `82661 ms`, `96691 ms`, `110721 ms`, `124751 ms`, `138781 ms`: lặp lại recover cycle, vẫn không có AT hợp lệ.
- `fixed_uart_no_invert`:
  - `8710 ms` vào AT_SYNC trên fixed UART.
  - `10610–14410 ms`: 2 timeout rồi RESET.
  - `20910–26610 ms`: 2 timeout rồi PWRKEY.
  - `33110–38810 ms`: 2 timeout rồi power-cycle recover.
  - Pattern này cho thấy logic hiện tại **timeout-driven recovery**, không phải **RDY-driven readiness**.
- Logic analyzer:
  - Không có artifact LA đọc được trong bộ file hiện tại, nên chưa map trực tiếp được cạnh RDY/PWRKEY/RESET.
  - Tuy vậy pattern rác serial ngay sau fallback gợi ý modem vẫn đang boot/reset lúc firmware đã probe AT.

## Unresolved questions
- Có tín hiệu RDY phần cứng riêng trên SIM7600 board này không, và đã được nối vào ESP32 chưa?
- RDY polarity/level là gì, có cần debounce/latch không?
- CPIN `+CME ERROR: SIM not inserted` xuất hiện ở log nào cụ thể, sau AT hợp lệ hay khi chưa ready?
- Có bao nhiêu ms boot window thực tế sau PWRKEY/RESET trên board này để chờ RDY trước khi AT?
- Logic analyzer trace có thể xác nhận thứ tự RDY vs AT vs RESET không?
