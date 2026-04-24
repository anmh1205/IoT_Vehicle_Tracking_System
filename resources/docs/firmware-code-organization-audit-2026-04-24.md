# Firmware Code Organization Audit

Date: 2026-04-24  
Scope: `iot-vehicle-tracking-system-firmware/main`  
Method: static code review (focus: organization/flow/naming/file split/redundancy; không focus runtime bug)

## Findings

### 1) [High] `state_machine.c` đang là God-file, luồng khó kiểm soát
- Evidence:
  - File dài 2417 lines.
  - Include nhiều domain cùng lúc (ADC/BLE/MQTT/LTE/GNSS/OTA/RTC/queue/session): `main/src/state_machine.c:20-38`.
  - State global quá nhiều (70 biến `s_*`): `main/src/state_machine.c:130-196`.
  - Macro policy/constant dày đặc ngay trong file (45 define): `main/src/state_machine.c:45-88`.
  - `state_machine_run()` dài và chứa nhiều side-effect liên domain: `main/src/state_machine.c:2504-2739`.
- Impact:
  - Review/trace regression khó.
  - Một thay đổi nhỏ dễ đụng nhiều hành vi không liên quan.
  - Test unit gần như không tách được.
- Recommend:
  - Tách theo bounded-context: `state_machine_core`, `network_orchestrator`, `sleep_controller`, `obd_orchestrator`, `ota_orchestrator`.
  - Giảm static shared-state; gom vào struct context truyền tường minh.

### 2) [High] `mqtt_client.c` gộp nhiều trách nhiệm vào một module
- Evidence:
  - Vừa giữ state + config cache: `main/src/mqtt_client.c:75-101`.
  - Vừa parse URC stream: `main/src/mqtt_client.c:717-857`.
  - Vừa connect/session-recovery/cleanup: `main/src/mqtt_client.c:859-1444`.
  - Vừa publish path + msg-id emulation: `main/src/mqtt_client.c:1502-1581`.
- Impact:
  - Luồng khó đọc, debug khó khoanh vùng.
  - Khó thay transport/backend parser độc lập.
- Recommend:
  - Tách thành 4 lớp: `mqtt_session`, `mqtt_urc_parser`, `mqtt_publish`, `mqtt_topics`.
  - Giữ API facade mỏng ở `mqtt_client.c`.

### 3) [Medium] Dead-path/feature-flag làm code khó bảo trì
- Evidence:
  - Hardcode fake sleep luôn bật: `main/src/state_machine.c:87`.
  - Nhánh sleep thực bị bypass compile-time: `main/src/state_machine.c:2725-2734`.
  - Nhiều hàm bị đánh dấu `__attribute__((unused))`: `main/src/state_machine.c:578`, `2278`, `2293`.
- Impact:
  - Code “để đó” lâu ngày lệch hành vi thật.
  - Team khó biết path nào đang production.
- Recommend:
  - Chuyển về Kconfig/runtime flag rõ ràng.
  - Xóa hẳn path không dùng, hoặc tách ra experimental module.

### 4) [Medium] Boundary module chưa rõ: `nvs_config.c` đang ôm quá nhiều vai trò
- Evidence:
  - Vừa config-domain (`app_config_set_defaults`, `app_config_is_valid`): `main/src/nvs_config.c:202`, `237`.
  - Vừa persistence NVS config: `main/src/nvs_config.c:313-422`.
  - Vừa persistence OTA context: `main/src/nvs_config.c:424-507`.
- Impact:
  - Tên file không phản ánh đúng nội dung.
  - Discoverability thấp, dễ đặt logic sai chỗ.
- Recommend:
  - Tách `app_config_defaults.c`, `config_store_nvs.c`, `ota_context_store_nvs.c`.

### 5) [Medium] Naming convention chưa nhất quán
- Evidence:
  - `TAG` hầu hết uppercase theo module, nhưng có outlier lowercase: `main/src/imu_lis3dh.c:45` (`"imu_lis3dh"`).
  - Cặp flag trạng thái dễ mâu thuẫn logic (`s_status_running`, `s_status_stopped`) cùng tồn tại: `main/src/state_machine.c:143-144`.
- Impact:
  - Log filtering không đồng đều.
  - State naming không single-source-of-truth, dễ drift.
- Recommend:
  - Chuẩn hóa TAG (UPPER_SNAKE_CASE).
  - Thay cặp bool bằng enum trạng thái publish (`RUNNING|STOPPED`).

### 6) [Medium] Duplicate flow ở publish path (DRY chưa tốt)
- Evidence:
  - 4 hàm publish có skeleton gần như lặp lại: lấy timestamp/metadata -> format payload -> live publish -> fallback queue.
  - `state_machine_publish_rawdata`: `main/src/state_machine.c:1248-1296`
  - `state_machine_publish_status`: `main/src/state_machine.c:1303-1353`
  - `state_machine_publish_event`: `main/src/state_machine.c:1358-1409`
  - `state_machine_publish_firmware_payload`: `main/src/state_machine.c:1430-1481`
- Impact:
  - Khi đổi policy publish/fallback phải sửa nhiều chỗ.
  - Dễ lệch behavior giữa topic types.
- Recommend:
  - Tạo helper thống nhất pipeline publish/fallback, mỗi loại chỉ cung cấp formatter + record type + qos policy.

### 7) [Low] Header coupling cao, phạm vi dữ liệu quá rộng
- Evidence:
  - `app_state.h` chứa cả FSM API + telemetry model + OBD model + RTC retained context: `main/inc/app_state.h:16-248`.
  - `app_config.h` chứa cả config + OTA status/error contract + runtime bounds: `main/inc/app_config.h:38-203`.
- Impact:
  - Include graph phình to.
  - Thay đổi nhỏ ở model kéo rebuild rộng, tăng rủi ro ảnh hưởng dây chuyền.
- Recommend:
  - Chia header theo domain: `telemetry_model.h`, `fsm_types.h`, `ota_contract.h`, `runtime_config.h`.

## Overall assessment
- Chưa đạt mức “chuẩn chỉ” về tổ chức code cho firmware quy mô này.
- Điểm yếu chính: module boundary + cohesion + flow complexity.
- Ưu tiên làm ngay: Finding #1, #2, #3 (giảm complexity trước rồi mới cleanup naming/headers).

## Unresolved questions
- Bạn muốn chuẩn naming theo style nào để chốt thống nhất: `module_action_object` hay `domain_object_action`?
- Có chấp nhận refactor tách file lớn theo nhiều PR nhỏ (an toàn) hay muốn một đợt refactor lớn?
