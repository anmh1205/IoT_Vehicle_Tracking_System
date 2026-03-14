const problemSolution = `flowchart LR
    A["Quản lý thủ công<br/>gọi điện, giấy tờ"] --> B["Chậm biết vị trí xe<br/>và sự cố vận hành"]
    B --> C["Thiếu cảnh báo tức thời<br/>quyết định chậm"]
    C --> D["Thiết bị tracker IoT<br/>GPS + OBD2 + IMU + 4G"]
    D --> E["Cloud và lưu trữ<br/>EMQX, Bridge, Backend"]
    E --> F["Dashboard giám sát<br/>bản đồ, cảnh báo, báo cáo"]
`;

const systemArchitecture = `flowchart LR
    OBD["vgate iCar Pro<br/>BLE OBD2"] --> Tracker["Thiết bị tracker<br/>ESP32-S3 + SIM7600CE-T"]
    Tracker --> EMQX["EMQX Broker"]
    EMQX --> Bridge["MQTT Bridge<br/>validate + fan-out"]
    Bridge --> Backend["Backend API<br/>Socket.IO"]
    Bridge --> Metrics["VictoriaMetrics<br/>telemetry"]
    Bridge --> Logs["VictoriaLogs<br/>nhật ký"]
    Backend --> Postgres["PostgreSQL<br/>nghiệp vụ"]
    Backend --> Web["Dashboard Web<br/>Next.js"]
    Backend --> Mobile["Mobile Shell<br/>Flutter WebView"]
    Metrics --> Grafana["Grafana<br/>quan trắc"]
    Logs --> Grafana
`;

const powerModes = `flowchart LR
    Parking["Chế độ đỗ xe<br/>Deep sleep + IMU canh rung"] -->|Bật máy| Driving["Chế độ lái xe<br/>4G + GNSS + OBD2 hoạt động"]
    Driving -->|Tắt máy| Parking
    Parking -->|IMU phát hiện rung| Alert["Chế độ cảnh báo<br/>Wake modem và gửi alert"]
    Alert -->|Hoàn tất hoặc timeout| Parking
    Alert -->|Xe tiếp tục chạy| Driving
`;

const dataArchitecture = `flowchart LR
    Tracker["Thiết bị tracker<br/>GPS, OBD2, nguồn"] --> Bridge["MQTT Bridge<br/>chuẩn hóa payload"]
    Frontend["Frontend và API<br/>truy vấn nghiệp vụ"] --> Backend["Backend API<br/>đọc theo use case"]
    Bridge --> PG["PostgreSQL<br/>xe, người dùng, cảnh báo"]
    Bridge --> VM["VictoriaMetrics<br/>telemetry thời gian thực"]
    Bridge --> VL["VictoriaLogs<br/>log kết nối"]
    Backend --> PG
    Backend --> Dashboard["Dashboard Web<br/>và mobile shell"]
    VM --> Dashboard
    VL --> Dashboard
`;

const trackerBlock = `flowchart LR
    Sense["Chia áp + ADC<br/>đo ắc quy 12V hoặc 24V"] --> MCU["ESP32-S3<br/>điều phối tracker"]
    Power["Điều khiển nguồn<br/>GPIO5, GPIO18, GPIO19, GPIO26"] --> MCU
    MCU --> IMU["LIS3DH IMU<br/>I2C GPIO47 và GPIO48<br/>INT1 GPIO21"]
    MCU --> OBD["vgate iCar Pro<br/>BLE OBD2"]
    MCU --> Modem["SIM7600CE-T<br/>UART1 GPIO16 và GPIO17<br/>PWRKEY GPIO26"]
    Battery["Ắc quy xe<br/>12V hoặc 24V"] --> Buck["MP2482 5V"]
    Buck --> Logic["XL1509 3.3V<br/>ESP32-S3, LIS3DH"]
    Buck --> Rail4V["TPS54231 ~4V<br/>SIM7600CE-T"]
    Buck --> Backup["TP4056 + pin 21700 + SX1308"]
`;

const powerManagement = `flowchart LR
    Battery["Ắc quy xe<br/>12V hoặc 24V"] --> Buck["MP2482<br/>Buck 5V"]
    Buck --> Logic["XL1509 3.3V<br/>ESP32-S3, LIS3DH"]
    Buck --> Modem["TPS54231 ~4V<br/>SIM7600CE-T"]
    Buck --> Charger["TP4056<br/>Sạc pin dự phòng"]
    Charger --> Backup["BMS 1S + pin 21700"]
    Backup --> Boost["SX1308<br/>Boost 5V backup"]
    Battery --> Monitor["LM393 + ADC<br/>Giám sát LVD"]
    Monitor --> FSM["ESP32 FSM nguồn<br/>GPIO18, GPIO19, GPIO5"]
    Boost --> FSM
    FSM --> Logic
    FSM --> Modem
`;

const firmwareLayers = `flowchart TB
    App["Lớp ứng dụng<br/>state machine, policy nguồn, cảnh báo"] --> Core["Lớp nghiệp vụ<br/>telemetry, OBD2, GNSS, MQTT"]
    Core --> Runtime["Lớp runtime<br/>FreeRTOS task, queue, timer"]
    Runtime --> HAL["Lớp HAL<br/>GPIO, UART, I2C, ADC, deep sleep"]
    HAL --> HW["ESP32-S3 và ngoại vi<br/>SIM7600CE-T, LIS3DH, BLE OBD2"]
`;

const taskInteraction = `flowchart LR
    ISR["ISR và IMU<br/>đánh thức hệ thống"] --> Power["power_task<br/>điều phối trạng thái"]
    OBD["obd_task"] --> Queue["telemetry_queue"]
    GPS["gnss_task"] --> Queue
    Sensor["sensor_task"] --> Queue
    Queue --> MQTT["mqtt_task"]
    MQTT --> Broker["EMQX Broker"]
    Command["command_task"] --> MQTT
    Power --> GPS
    Power --> MQTT
    Power --> Command
`;

const deviceState = `stateDiagram-v2
    [*] --> Boot
    state "Khởi động" as Boot
    state "Lái xe" as Driving
    state "Đỗ xe" as Parking
    state "Cảnh báo" as Alert
    Boot --> Driving: IGN ON
    Boot --> Parking: IGN OFF
    Driving --> Parking: Tắt máy
    Parking --> Driving: Bật máy
    Parking --> Alert: IMU phát hiện rung
    Alert --> Parking: Gửi alert xong
    Alert --> Driving: Xe tiếp tục chạy
`;

const frontendFsd = `flowchart TB
    Root["Tracking_Frontend / src"] --> App["app/<br/>router, layout, dashboard, map"]
    Root --> Features["features/<br/>vehicles, alerts, trips"]
    Root --> Components["components/<br/>ui, forms, layout, charts"]
    Root --> Lib["lib/<br/>api, realtime, store, utils"]
    Root --> Support["hooks + types<br/>hook dùng chung, kiểu toàn cục"]
    App --> Features
    Features --> Components
    Features --> Lib
    Lib --> Support
`;

const authSequence = `sequenceDiagram
    actor U as Người dùng
    participant F as Frontend Next.js
    participant B as Backend API
    participant P as PostgreSQL
    participant S as Zustand Store
    U->>F: Nhập email và mật khẩu
    F->>B: POST /api/v1/auth/login
    B->>P: Tra cứu user và session
    P-->>B: Hash, vai trò, trạng thái
    B-->>F: Session token và hồ sơ
    F->>S: Lưu token trong bộ nhớ
    F->>B: GET /dashboard
    B-->>F: Dữ liệu trang và quyền truy cập
`;

const mapIntegration = `flowchart LR
    Server["Backend API<br/>Socket.IO"] --> Store["Zustand realtime store"]
    Store --> Map["React Leaflet Map"]
    Store --> Sidebar["Sidebar thông tin xe"]
    Map --> Visual["Marker và route replay"]
    Sidebar --> Visual
`;

const optimizedArchitecture = `flowchart LR
    Device["Thiết bị tracker<br/>ESP32-S3 + SIM7600CE-T"] --> EMQX["EMQX Broker"]
    EMQX --> Bridge["MQTT Bridge"]
    Bridge --> Backend["Backend API"]
    Backend --> Query["TanStack Query<br/>dữ liệu lịch sử"]
    Backend --> Store["Zustand + Socket.IO<br/>state realtime"]
    Bridge --> Metrics["VictoriaMetrics"]
    Bridge --> Logs["VictoriaLogs"]
    Query --> Dashboard["Dashboard Next.js"]
    Store --> Dashboard
    Metrics --> Ops["Grafana và quan trắc"]
    Logs --> Ops
`;

const ivmStructure = `flowchart TB
    Root["iot-vehicle-tracking-system/"] --> Backend["Tracking_Backend<br/>Express + TypeScript"]
    Root --> Frontend["Tracking_Frontend<br/>Next.js Dashboard"]
    Root --> Bridge["Tracking_MqttBridge<br/>dịch vụ fan-out"]
    Root --> Broker["Tracking_EMQX<br/>broker MQTT"]
    Root --> Database["Tracking_PostgreSQL<br/>cơ sở dữ liệu quan hệ"]
    Root --> Metrics["Tracking_VictoriaMetrics<br/>time-series"]
    Root --> Logs["Tracking_VictoriaLogs<br/>kho log tập trung"]
    Root --> Grafana["Tracking_Grafana<br/>dashboard quan trắc"]
    Root --> Data["Tracking_Data<br/>volumes runtime"]
`;

const mqttBridgeFlow = `flowchart LR
    EMQX["EMQX Broker<br/>topic telemetry, alert"] --> Parse["1. Parse topic<br/>và payload JSON"]
    Parse --> Validate["2. Validate schema<br/>chuẩn hóa timestamp"]
    Validate --> Fanout["3. Fan-out<br/>ghi nhiều đích"]
    Fanout --> VM["VictoriaMetrics<br/>GPS, OBD2, sensor"]
    Fanout --> VL["VictoriaLogs<br/>log và audit"]
    Fanout --> PG["PostgreSQL<br/>runtime, alert"]
    Fanout --> Socket["Socket.IO<br/>đẩy realtime"]
`;

const backendFolder = `flowchart TB
    Root["Tracking_Backend / src"] --> Core["core/<br/>interface, type, schema"]
    Root --> Modules["modules/<br/>auth, device, telemetry, vehicle"]
    Root --> Middleware["middleware/<br/>auth, rate-limit, metrics"]
    Root --> Shared["shared/<br/>utils, response, helper"]
    Root --> Entry["entrypoints<br/>routes, index, Socket.IO"]
    Modules --> Shared
    Entry --> Modules
    Entry --> Middleware
`;

const frontendFolder = `flowchart TB
    Root["Tracking_Frontend / src"] --> App["app/<br/>layout, page, dashboard, map"]
    Root --> Components["components/<br/>ui, layout, forms, charts"]
    Root --> Features["features/<br/>vehicles, alerts, trips"]
    Root --> Lib["lib/<br/>api, realtime, store, utils"]
    Root --> Types["types/<br/>kiểu dữ liệu dùng chung"]
    App --> Features
    Features --> Components
    Features --> Lib
`;

const testEnvironment = `flowchart LR
    Bench["Bench test phần cứng<br/>nguồn DC, DMM, tracker"] --> Network["Mạng 4G hoặc Wi-Fi"]
    Vehicle["Xe thử nghiệm<br/>OBD2 và hành trình thực tế"] --> Network
    Network --> Cloud["Cloud test stack<br/>EMQX, Bridge, Backend"]
    Cloud --> Dashboard["Dashboard Web<br/>và Grafana"]
    Dashboard --> Result["Log, metric<br/>và kết quả đo"]
`;

const labSetup = `flowchart LR
    Supply["Nguồn DC 12V hoặc 24V"] --> Tracker["Tracker prototype"]
    DMM["Đồng hồ DMM"] --> Tracker
    OBD["OBD2 simulator"] --> Tracker
    Scope["Oscilloscope"] --> Tracker
    Tracker --> Laptop["Laptop thu log"]
`;

const vehicleInstall = `flowchart LR
    OBD["Cổng OBD2"] --> Cabin["Tracker trong cabin"]
    Cabin --> Antenna["Anten LTE và GNSS"]
    Cabin --> Note["Lưu ý lắp đặt<br/>cố định, tránh rung và ẩm"]
    Cabin --> Telemetry["Luồng telemetry<br/>GPS, OBD2, cảnh báo"]
`;

const projectPhases = `flowchart TB
    subgraph R1["Ba giai đoạn nền tảng"]
        direction LR
        A["Giai đoạn 1<br/>Nghiên cứu và thiết kế phần cứng"] --> B["Giai đoạn 2<br/>Phát triển firmware ESP-IDF"]
        B --> C["Giai đoạn 3<br/>Triển khai hạ tầng cloud"]
    end
    subgraph R2["Ba giai đoạn hoàn thiện hệ thống"]
        direction LR
        D["Giai đoạn 4<br/>Xây dựng backend API"] --> E["Giai đoạn 5<br/>Phát triển frontend dashboard"]
        E --> F["Giai đoạn 6<br/>Tích hợp và kiểm thử"]
    end
    C --> D
`;

const roadmapPlan = `flowchart TB
    subgraph M1["Các mốc hoàn thiện prototype"]
        direction LR
        P1["Mốc 1<br/>Prototype hoàn chỉnh"] --> P2["Mốc 2<br/>Pilot trong xe thử nghiệm"]
        P2 --> P3["Mốc 3<br/>Ổn định hóa cloud và dashboard"]
    end
    subgraph M2["Các mốc mở rộng sản phẩm"]
        direction LR
        P4["Mốc 4<br/>Ứng dụng di động và thông báo đẩy"] --> P5["Mốc 5<br/>PCB chuyên dụng và tối ưu sản xuất"]
        P5 --> P6["Mốc 6<br/>Mở rộng AI, bảo mật và scale-out"]
    end
    P3 --> P4
`;

const bleObdSequence = `sequenceDiagram
    participant ESP as ESP32-S3 tracker
    participant OBD as vgate iCar Pro
    ESP->>OBD: BLE scan<br/>lọc tên hoặc service UUID
    ESP->>OBD: Connect + GATT discovery
    ESP->>OBD: ATZ / ATE0 / ATL0 / ATS0 / ATSP0
    loop Chu kỳ đọc khi IGN ON
        ESP->>OBD: 010C / 010D / 0105 / 012F / AT IGN
        OBD-->>ESP: 41 0C / 41 0D / dữ liệu phản hồi
    end
    Note over ESP: Nếu timeout 2-3 lần,<br/>fallback sang đọc U_batt qua ADC
`;

const lis3dhWiring = `flowchart LR
    subgraph MCU["ESP32-S3"]
        SCL["GPIO48<br/>I2C SCL"]
        SDA["GPIO47<br/>I2C SDA"]
        INT["GPIO21<br/>INT1 wake-up"]
        VCC["3.3V rail"]
        GND["GND"]
    end
    subgraph IMU["LIS3DH"]
        ISCL["SCL"]
        ISDA["SDA"]
        IINT["INT1"]
        IVDD["VDD 3.3V"]
        IGND["GND"]
    end
    SCL -->|I2C 400 kHz| ISCL
    SDA -->|Địa chỉ 0x18| ISDA
    INT -->|Đánh thức MCU| IINT
    VCC --> IVDD
    GND --> IGND
`;

const firmwareMainFlow = `flowchart TB
    A["Khởi động firmware"] --> B["Khởi tạo IMU, modem, ADC, BLE,<br/>queue và các task FreeRTOS"]
    B --> C{"Đọc được IGN từ OBD2?"}
    C -->|Có| D["Dùng IGN từ ECU qua BLE OBD2"]
    C -->|Không| E["Fallback sang điện áp ắc quy ADC<br/>theo profile 12V hoặc 24V"]
    D --> F{"IGN ON?"}
    E --> F
    F -->|Có| G["Chế độ lái xe<br/>BLE OBD2 + GNSS + 4G hoạt động"]
    F -->|Không| H{"IMU phát hiện rung?"}
    H -->|Không| I["Chế độ đỗ xe<br/>gửi heartbeat rồi deep sleep"]
    H -->|Có| J["Chế độ cảnh báo<br/>wake modem và gửi alert ưu tiên"]
    G --> K{"Kết thúc chu kỳ?"}
    J --> K
    I --> K
    K -->|IGN còn ON| G
    K -->|IGN OFF| I
`;

const bleObdFlow = `flowchart TB
    A["Bắt đầu module BLE OBD2"] --> B{"Đã lưu địa chỉ BLE?"}
    B -->|Có| C["Reconnect nhanh tới vgate iCar Pro"]
    B -->|Không| D["Scan BLE và lọc theo tên<br/>hoặc service UUID"]
    D --> E["Chọn adapter phù hợp<br/>và lưu MAC vào NVS"]
    C --> F["GATT discovery<br/>tìm TX / RX characteristic"]
    E --> F
    F --> G["Khởi tạo ELM327<br/>ATZ, ATE0, ATL0, ATS0, ATSP0"]
    G --> H{"Đang ở chế độ lái xe?"}
    H -->|Có| I["Gửi PID 010C, 010D, 0105, 012F,<br/>AT IGN và parse phản hồi"]
    I --> J["Đẩy telemetry vào queue"]
    J --> H
    H -->|Không| K["Ngắt BLE và trả quyền cho deep sleep"]
    I --> L{"Timeout 2-3 lần?"}
    L -->|Có| M["Fallback xác định IGN<br/>qua điện áp ắc quy ADC"]
    L -->|Không| J
`;

const modemControlFlow = `flowchart TB
    A["Wake modem hoặc khởi tạo cold start"] --> B["AT -> CPIN -> CEREG -> CSQ"]
    B --> C{"Modem phản hồi?"}
    C -->|Không| D["Reset PWRKEY GPIO26<br/>và đợi 10-30 giây"]
    D --> B
    C -->|Có| E{"Đã đăng ký mạng?"}
    E -->|Chưa| F["Đợi và retry CEREG / CPIN"]
    F --> B
    E -->|Rồi| G{"Chế độ hoạt động hiện tại?"}
    G -->|Lái xe| H["Giữ LTE active, bật GNSS,<br/>đọc CGNSINF hoặc CGNSTST"]
    G -->|Heartbeat| I["Bật LTE, gửi heartbeat,<br/>tắt PDP rồi về sleep"]
    G -->|Đỗ xe| J["AT+CGACT=0,1 hoặc AT+CFUN=4<br/>sau đó AT+CSCLK=1"]
    H --> K["Gửi telemetry MQTT"]
    I --> J
    K --> J
`;

const powerPathFlow = `flowchart TB
    A["Đọc U_batt, IGN và cờ LVD"] --> B{"IGN ON?"}
    B -->|Có| C["GPIO18 = LOW<br/>ưu tiên nhánh chính MP2482"]
    C --> D["GPIO5 = HIGH<br/>cho phép sạc TP4056"]
    B -->|Không| E{"U_batt <= Switch_OFF?"}
    E -->|Có| F["GPIO18 = HIGH<br/>ưu tiên nhánh backup SX1308"]
    F --> G["GPIO5 = LOW<br/>tắt sạc để bảo vệ ắc quy"]
    G --> H["Set cờ low battery / alert"]
    E -->|Không| I{"U_batt >= Switch_ON?"}
    I -->|Có| J["GPIO18 = LOW<br/>quay lại nhánh chính"]
    J --> K["GPIO5 = LOW nếu đang parking"]
    I -->|Không| L["Giữ trạng thái trước đó"]
    D --> M["Delay 5 giây rồi lặp"]
    H --> M
    K --> M
    L --> M
`;

const backendAlertFlow = `flowchart LR
    Broker["EMQX Rules Engine"] --> Parse["Phát hiện event<br/>motion, speed, low battery"]
    Parse --> Bridge["MQTT Bridge<br/>validate và enrich payload"]
    Bridge --> Logs["VictoriaLogs<br/>lưu log sự kiện"]
    Bridge --> Pg["PostgreSQL<br/>ghi alert và trạng thái"]
    Bridge --> Socket["Socket.IO<br/>đẩy cảnh báo realtime"]
    Socket --> Dashboard["Dashboard Web<br/>toast, badge, lịch sử"]
`;

const dbErd = `erDiagram
    USERS ||--o{ VEHICLES : quan_ly
    VEHICLES ||--o{ DEVICES : gan_tracker
    DEVICES ||--|| DEVICE_CONFIGURATIONS : cau_hinh
    VEHICLES ||--o{ TRIPS : phat_sinh
    TRIPS ||--o{ TRIP_EVENTS : gom
    VEHICLES ||--o{ ALERTS : sinh_ra
    VEHICLES }o--o{ GEOFENCES : gan_vung
    DEVICES ||--o{ COMMANDS : nhan_lenh

    USERS {
        uuid id
        string email
        string role
    }
    VEHICLES {
        uuid id
        string license_plate
        string status
    }
    DEVICES {
        uuid id
        string serial
        string modem_imei
    }
    DEVICE_CONFIGURATIONS {
        uuid device_id
        string power_profile
        string mqtt_topic
    }
    TRIPS {
        uuid id
        uuid vehicle_id
        timestamp start_time
        timestamp end_time
    }
    TRIP_EVENTS {
        uuid id
        uuid trip_id
        string event_type
    }
    ALERTS {
        uuid id
        uuid vehicle_id
        string severity
    }
    GEOFENCES {
        uuid id
        string name
        string geometry
    }
    COMMANDS {
        uuid id
        uuid device_id
        string command_type
    }
`;

const queryStoreFlow = `flowchart LR
    UI["Trang Next.js"] --> Query["TanStack Query<br/>dữ liệu lịch sử"]
    UI --> Store["Zustand Store<br/>state realtime"]
    Query --> Api["Backend API"]
    Api --> Pg["PostgreSQL"]
    Api --> Vm["VictoriaMetrics"]
    Socket["Socket.IO"] --> Store
    Store --> Map["Map / Sidebar / Chart"]
    Query --> Map
`;

const mapLayerBreakdown = `flowchart TB
    Root["Trang bản đồ React Leaflet"] --> Tile["Tile layer nền"]
    Root --> Marker["Marker xe theo thời gian thực"]
    Root --> Route["Route replay / polyline"]
    Root --> Fence["Geofence overlay"]
    Root --> Side["Sidebar trạng thái xe"]
    Socket["Socket.IO"] --> Marker
    Socket --> Side
    Query["TanStack Query"] --> Route
    Query --> Fence
`;

const uartModemWiring = `flowchart LR
    subgraph MCU["ESP32-S3"]
        TX["GPIO16<br/>UART1 TX"]
        RX["GPIO17<br/>UART1 RX"]
        PWR["GPIO26<br/>PWRKEY"]
        FLOW["RTS / CTS<br/>dự phòng"]
    end
    subgraph MODEM["SIM7600CE-T"]
        MRX["SIMCOM-RX"]
        MTX["SIMCOM-TX"]
        MPW["SIMCOM-PWRKEY"]
        MFL["RTS / CTS"]
        MV["VBAT 3.4-4.2V"]
    end
    TX -->|TX -> RX| MRX
    RX -->|RX <- TX| MTX
    PWR --> MPW
    FLOW -.-> MFL
    Rail["TPS54231<br/>rail modem ~4V"] --> MV
`;

const voltageDivider = `flowchart LR
    Batt["Ắc quy xe<br/>12V hoặc 24V"] --> R1["R1 = 100 kΩ"]
    R1 --> Node["Nút chia áp<br/>V_adc = U_batt x 0.0909"]
    Node --> ADC["GPIO4 ADC1<br/>ESP32-S3"]
    Node --> R2["R2 = 10 kΩ"]
    R2 --> GND["GND"]
    ADC --> Profile["Firmware quy đổi ngưỡng<br/>IGN và LVD theo profile"]
`;

const wiringOverview = `flowchart LR
    Batt["Voltage divider<br/>GPIO4 ADC"] --> MCU["ESP32-S3"]
    Power["GPIO5 CHARGER_EN<br/>GPIO18 POWER_PATH_EN<br/>GPIO19 LVD_STATUS"] --> MCU
    MCU --> Sim["SIM7600CE-T<br/>UART1 GPIO16 / GPIO17<br/>PWRKEY GPIO26"]
    MCU --> Imu["LIS3DH<br/>GPIO47 / GPIO48<br/>INT1 GPIO21"]
    MCU --> Obd["vgate iCar Pro<br/>BLE OBD-II"]
    MCU --> Note["Log / MQTT / state machine"]
`;

const buckStage = `flowchart TB
    Vin["Ắc quy xe 12V hoặc 24V"] --> Fuse["Cầu chì đầu vào"]
    Fuse --> Mp["MP2482-5.0<br/>buck 5V / 3A"]
    Cin["C1 100 uF / 50V"] --> Mp
    Mp --> L1["Cuộn cảm 100 uH"]
    Mp --> D1["Diode Schottky 1N5822"]
    L1 --> Bus["Bus 5V chính"]
    D1 --> Bus
    Bus --> Cout["C2 220 uF / 16V"]
`;

const boostStage = `flowchart TB
    Cell["Pin 21700 3.0-4.2V"] --> Bms["BMS 1S"]
    Bms --> Boost["SX1308<br/>boost lên 5V"]
    Boost --> D1["Diode Schottky"]
    D1 --> Bus["Bus 5V backup"]
    Bus --> Load["Cấp runtime khi mất nguồn chính"]
`;

const powerMux = `flowchart TB
    subgraph Sense["Khối giám sát và điều phối"]
        direction LR
        Lvd["GPIO19 LVD_STATUS"] --> Fsm["ESP32 Power FSM"]
        Adc["GPIO4 ADC"] --> Fsm
    end
    subgraph Path["Hai nhánh cấp nguồn runtime"]
        direction LR
        Main["MP2482 5V"] --> D1["D1 Schottky"] --> Bus["Bus 5V runtime"]
        Backup["SX1308 5V backup"] --> D2["D2 Schottky"] --> Bus
    end
    Fsm --> En["GPIO18 POWER_PATH_EN"]
    En -. ưu tiên nhánh chính .-> Main
    Fsm --> Charge["GPIO5 CHARGER_EN"]
    Charge -. bật hoặc tắt sạc .-> Backup
    Bus --> Rails["XL1509 3.3V và TPS54231 ~4V"]
`;

const chargerChain = `flowchart TB
    subgraph Charge["Chuỗi sạc pin và cấp dự phòng"]
        direction LR
        Bus["Bus 5V từ MP2482"] --> Tp["TP4056<br/>mạch sạc Li-ion"] --> Bms["BMS 1S / protection"]
    end
    En["GPIO5 CHARGER_EN"] -. bật hoặc tắt sạc .-> Tp
    Bms --> Cell["Pin 21700 5000 mAh"]
    Cell --> Boost["SX1308 backup"]
    Boost --> Runtime["Nguồn dự phòng cho tracker"]
`;

const enclosureLayout = `flowchart TB
    subgraph Box["Vỏ hộp tracker 100 x 70 x 35 mm"]
        direction LR
        subgraph Ctrl["Khối điều khiển và RF"]
            direction TB
            Top1["ESP32-S3 DevKit"]
            Top2["SIM7600CE-T + rail ~4V"]
            Low1["Anten 4G/LTE"]
            Low2["Anten GNSS"]
        end
        subgraph Power["Khối nguồn và đầu nối"]
            direction TB
            Top3["TP4056 + BMS"]
            Mid1["MP2482 + XL1509"]
            Mid2["SX1308 + diode-OR"]
            Mid3["Pin 21700 + giá đỡ"]
            Low3["Cổng OBD2 / USB debug / khe SIM"]
        end
    end
    Top2 --> Top1
    Top1 -. anten LTE .-> Low1
    Top2 -. anten GNSS .-> Low2
    Top3 --> Mid3
`;

const assemblyFlow = `flowchart TB
    subgraph S1["Chuẩn bị và tích hợp điện"]
        direction LR
        A["Bước 1<br/>Kiểm tra linh kiện"] --> B["Bước 2<br/>Lắp nhánh nguồn"]
        B --> C["Bước 3<br/>Gắn ESP32-S3 và đi dây GPIO"]
    end
    subgraph S2["Kết nối, test và hoàn thiện"]
        direction LR
        D["Bước 4<br/>Kết nối modem, IMU và ADC"] --> E["Bước 5<br/>Nạp firmware test tích hợp"]
        E --> F["Bước 6<br/>Đóng vỏ và hoàn thiện anten"]
    end
    C --> D
`;

const prototypeLayout = `flowchart TB
    subgraph Bench["Mặt bằng prototype sau lắp ráp"]
        MCU["ESP32-S3"]
        Modem["SIM7600CE-T + anten"]
        Charge["TP4056 + BMS"]
        Buck["MP2482 / XL1509"]
        Boost["SX1308 / diode-OR"]
        Cell["Pin 21700"]
        Uart["Header UART / USB debug"]
        Imu["Header I2C / IMU"]
        Vin["Nguồn vào 12V / 24V"]
    end
    MCU --> Uart
    MCU --> Imu
    Buck --> Vin
    Charge --> Cell
    Boost --> Cell
`;

const obdPlacement = `flowchart TB
    subgraph Cabin["Khoang lái / khu vực táp-lô"]
        direction LR
        Port["Cổng OBD2 dưới táp-lô"] --> Dongle["vgate iCar Pro<br/>BLE dongle cắm trực tiếp"]
    end
    Dongle -. BLE không dây .-> Tracker["Tracker đặt trong cabin<br/>hoặc gần hộp cầu chì"]
    Tracker --> Note["Không cần cắm tracker cố định<br/>trực tiếp vào cổng OBD2"]
`;

const vehicleInstallation = `flowchart TB
    subgraph Car["Khoang lắp đặt trong xe"]
        direction TB
        Tracker["Tracker dưới táp-lô"]
        Gps["Anten GNSS gần kính trước"]
        Lte["Anten 4G/LTE tránh nguồn xung"]
        Ble["vgate iCar Pro<br/>kênh BLE OBD2"]
        Obd["Cổng OBD2"]
    end
    Tracker --> Gps
    Tracker --> Lte
    Tracker -. BLE .-> Ble
    Ble --> Obd
`;

const installChecklist = `flowchart TB
    subgraph C1["Kiểm tra kết nối và định vị"]
        direction LR
        P1["Nguồn điện đầu vào<br/>đạt 12V hoặc 24V"] --> P2["BLE OBD2<br/>đọc IGN, RPM, tốc độ"]
        P2 --> P3["GNSS<br/>fix vị trí ổn định"]
    end
    subgraph C2["Kiểm tra truyền thông và năng lượng"]
        direction LR
        P4["4G / LTE<br/>đăng ký mạng và gửi MQTT"] --> P5["Power path<br/>chuyển nguồn không reset"]
        P5 --> P6["IMU wake-up và deep sleep<br/>hoạt động đúng chu kỳ"]
    end
    P3 --> P4
`;

const firmwareImplementationFlow = `flowchart TB
    A["STATE_INIT<br/>khởi tạo driver và load cấu hình"] --> B["STATE_CHECK_IGN<br/>ưu tiên OBD2 rồi fallback ADC"]
    B --> C{"IGN ON?"}
    C -->|Có| D["STATE_DRIVING<br/>OBD2 + GNSS + MQTT"]
    C -->|Không| E{"Có cảnh báo rung?"}
    E -->|Có| F["STATE_ALERT<br/>wake modem và gửi cảnh báo"]
    E -->|Không| G["STATE_HEARTBEAT<br/>gửi heartbeat định kỳ"]
    D --> H["STATE_SLEEP<br/>deep sleep theo policy"]
    F --> H
    G --> H
    H --> B
`;

const appendixGantt = `gantt
    title Kế hoạch triển khai dự án trong 24 tuần
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m

    section Phần cứng
    Nghiên cứu và thiết kế         :a1, 2025-09-01, 28d

    section Firmware
    Setup nền tảng và driver       :a2, 2025-09-15, 21d
    BLE OBD2 và quản lý nguồn      :a3, after a2, 35d

    section Cloud và Backend
    Triển khai EMQX, DB, Docker    :a4, 2025-09-29, 28d
    Backend API và MQTT Bridge     :a5, 2025-10-13, 42d

    section Frontend
    Dashboard, bản đồ, cảnh báo    :a6, 2025-11-10, 42d

    section Tích hợp
    Tích hợp và kiểm thử hệ thống  :a7, 2025-12-22, 42d
    Viết báo cáo và bảo vệ         :a8, 2026-01-19, 28d
`;

export const mermaidDiagrams = [
  { name: "03-chuong-3-giai-phap-phan-cung-hinh-3-2.svg", code: bleObdSequence },
  { name: "03-chuong-3-giai-phap-phan-cung-hinh-3-3.svg", code: lis3dhWiring },
  { name: "04-chuong-3-giai-phap-firmware-hinh-3-5.svg", code: firmwareLayers },
  { name: "04-chuong-3-giai-phap-firmware-hinh-3-6.svg", code: taskInteraction },
  { name: "04-chuong-3-giai-phap-firmware-hinh-3-7.svg", code: firmwareMainFlow },
  { name: "04-chuong-3-giai-phap-firmware-hinh-3-8.svg", code: bleObdFlow },
  { name: "04-chuong-3-giai-phap-firmware-hinh-3-9.svg", code: modemControlFlow },
  { name: "04-chuong-3-giai-phap-firmware-hinh-3-10.svg", code: powerPathFlow },
  { name: "04-chuong-3-giai-phap-firmware-hinh-3-11.svg", code: deviceState },
  { name: "05-chuong-3-giai-phap-backend-hinh-3-14.svg", code: dbErd },
  { name: "thesis-05-chuong-3-giai-phap-backend-01.svg", code: dataArchitecture },
  { name: "thesis-05-chuong-3-giai-phap-backend-02.svg", code: backendAlertFlow },
  { name: "thesis-05-chuong-3-giai-phap-backend-03.svg", code: dataArchitecture },
  { name: "thesis-05-chuong-3-giai-phap-backend-04.svg", code: dbErd },
  { name: "07-chuong-4-trien-khai-hardware-hinh-4-2.svg", code: uartModemWiring },
  { name: "07-chuong-4-trien-khai-hardware-hinh-4-3.svg", code: voltageDivider },
  { name: "07-chuong-4-trien-khai-hardware-hinh-4-5.svg", code: wiringOverview },
  { name: "07-chuong-4-trien-khai-hardware-hinh-4-13.svg", code: prototypeLayout },
  { name: "thesis-08-chuong-4-trien-khai-firmware-01.svg", code: firmwareImplementationFlow },
  { name: "thesis-99-bao-cao-thesis-hoan-chinh-04.svg", code: dataArchitecture },
  { name: "thesis-99-bao-cao-thesis-hoan-chinh-05.svg", code: queryStoreFlow },
  { name: "thesis-99-bao-cao-thesis-hoan-chinh-06.svg", code: mapLayerBreakdown },
  { name: "thesis-14-phu-luc-01.svg", code: appendixGantt },
];
