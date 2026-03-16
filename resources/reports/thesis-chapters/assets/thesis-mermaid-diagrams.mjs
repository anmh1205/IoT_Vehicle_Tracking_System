const problemSolution = `flowchart LR
    subgraph Current["Bài toán hiện tại"]
        C1["Quản lý đội xe thủ công"]
        C2["Theo dõi vị trí chậm"]
        C3["Xử lý sự cố trễ"]
        C1 --> C2 --> C3
    end
    subgraph Proposed["Giải pháp đề xuất"]
        P1["Thiết bị tracker IoT\nGPS + OBD2 + IMU + 4G"]
        P2["Cloud xử lý dữ liệu\nEMQX + Bridge + Backend"]
        P3["Dashboard giám sát\nBản đồ + Cảnh báo + Báo cáo"]
        P1 --> P2 --> P3
    end
    C3 ----> P1
`;

const projectPhases = `flowchart LR
    S["Khởi động dự án"] --> P1["Giai đoạn 1\nPhân tích yêu cầu"]
    P1 --> P2["Giai đoạn 2\nThiết kế phần cứng"]
    P2 --> P3["Giai đoạn 3\nPhát triển firmware"]
    P3 --> P4["Giai đoạn 4\nTriển khai cloud"]
    P4 --> P5["Giai đoạn 5\nXây dựng frontend"]
    P5 --> P6["Giai đoạn 6\nTích hợp và kiểm thử"]
`;

const systemArchitecture = `flowchart TB
    subgraph Vehicle["Thiết bị trên xe"]
        OBD["OBD2 BLE Adapter"]
        Tracker["Tracker\nESP32-S3 + SIM7600CE-T"]
        OBD --> Tracker
    end

    subgraph Cloud["Tầng cloud"]
        EMQX["EMQX Broker"]
        Bridge["MQTT Bridge"]
        API["Backend API\nSocket.IO"]
        PG["PostgreSQL"]
        VM["VictoriaMetrics"]
        VL["VictoriaLogs"]
        EMQX --> Bridge
        Bridge --> API
        Bridge --> VM
        Bridge --> VL
        API --> PG
    end

    subgraph Client["Tầng hiển thị"]
        Web["Dashboard Next.js"]
        Mobile["Mobile Shell"]
        Grafana["Grafana"]
    end

    Tracker ----> EMQX
    API ----> Web
    API ----> Mobile
    VM ----> Grafana
    VL ----> Grafana
`;

const powerModes = `stateDiagram-v2
    direction LR
    [*] --> Parking
    state "Parking\nDeep sleep" as Parking
    state "Driving\n4G + GNSS + OBD2" as Driving
    state "Alert\nWake modem" as Alert

    Parking --> Driving: IGN ON
    Driving --> Parking: IGN OFF
    Parking --> Alert: IMU rung
    Alert --> Parking: Hoàn tất
    Alert --> Driving: Xe tiếp tục chạy
`;

const roadmapPlan = `flowchart LR
    A["Prototype"] --> B["Pilot trên xe thật"]
    B --> C["Ổn định cloud + dashboard"]
    C --> D["Mở rộng mobile + cảnh báo đẩy"]
    D --> E["PCB chuyên dụng"]
    E --> F["Scale-out + bảo mật nâng cao"]
`;

const dataArchitecture = `flowchart LR
    Device["Tracker"] --> Bridge["MQTT Bridge"]
    Bridge --> PG["PostgreSQL\nNghiệp vụ"]
    Bridge --> VM["VictoriaMetrics\nTelemetry"]
    Bridge --> VL["VictoriaLogs\nAudit log"]
    API["Backend API"] --> PG
    API --> VM
    Dashboard["Dashboard"] --> API
    Dashboard --> Socket["Socket.IO"]
    Socket --> Bridge
`;

const trackerBlock = `flowchart LR
    subgraph Input["Nguồn vào"]
        Batt["Ắc quy 12V/24V"]
        Buck["Buck 5V"]
        Backup["Pin dự phòng + Boost"]
        Batt --> Buck
        Batt --> Backup
    end

    subgraph Core["Khối điều khiển"]
        MCU["ESP32-S3"]
        PM["Power FSM"]
        PM --> MCU
    end

    subgraph IO["Ngoại vi"]
        Modem["SIM7600CE-T"]
        IMU["LIS3DH"]
        OBD["BLE OBD2"]
    end

    Buck ----> MCU
    Backup ----> MCU
    MCU ----> Modem
    MCU ----> IMU
    MCU ----> OBD
`;

const bleObdSequence = `sequenceDiagram
    participant ESP as ESP32-S3
    participant OBD as vgate iCar Pro

    ESP->>OBD: BLE scan + connect
    ESP->>OBD: GATT discovery
    ESP->>OBD: Init ELM327 (ATZ, ATE0, ATSP0)
    loop Khi IGN ON
        ESP->>OBD: Đọc PID 010C / 010D / 0105
        OBD-->>ESP: Trả telemetry
    end
`;

const lis3dhWiring = `flowchart LR
    subgraph MCU["ESP32-S3"]
        SCL["GPIO48 - SCL"]
        SDA["GPIO47 - SDA"]
        INT["GPIO21 - INT1"]
        VCC["3.3V"]
        GND["GND"]
    end

    subgraph IMU["LIS3DH"]
        I2CSCL["SCL"]
        I2CSDA["SDA"]
        I2CINT["INT1"]
        IVCC["VDD"]
        IGND["GND"]
    end

    SCL ----> I2CSCL
    SDA ----> I2CSDA
    INT ----> I2CINT
    VCC --> IVCC
    GND --> IGND
`;

const powerManagement = `block-beta
    columns 4
    Vin["Nguồn xe 12V/24V"]
    Buck["MP2482 5V"]
    Rail33["Rail 3.3V"]
    Rail4["Rail 4V modem"]
    Charge["TP4056"]
    Cell["Pin 21700"]
    Boost["SX1308"]
    Fsm["Power FSM"]

    Vin --> Buck
    Buck --> Rail33
    Buck --> Rail4
    Buck --> Charge
    Charge --> Cell
    Cell --> Boost
    Boost --> Fsm
    Fsm --> Rail33
    Fsm --> Rail4
`;

const firmwareLayers = `flowchart TB
    A["Application Layer\nPolicy + State machine"]
    B["Domain Layer\nTelemetry + Alert + OBD2"]
    C["Runtime Layer\nFreeRTOS Task/Queue/Timer"]
    D["HAL Layer\nGPIO/UART/I2C/ADC"]
    E["Hardware\nESP32-S3 + SIM7600 + LIS3DH"]

    A --> B --> C --> D --> E
`;

const taskInteraction = `flowchart LR
    IMU["IMU ISR"] --> PowerTask["power_task"]
    OBDTask["obd_task"] --> Queue["telemetry_queue"]
    GNSSTask["gnss_task"] --> Queue
    SensorTask["sensor_task"] --> Queue
    Queue --> MQTTTask["mqtt_task"]
    MQTTTask --> Broker["EMQX"]
    CmdTask["command_task"] --> MQTTTask
    PowerTask --> OBDTask
    PowerTask --> GNSSTask
    PowerTask --> CmdTask
`;

const firmwareMainFlow = `stateDiagram-v2
    direction LR
    [*] --> Init
    Init --> CheckIGN
    CheckIGN --> Driving: IGN ON
    CheckIGN --> Idle: IGN OFF
    Idle --> Alert: Có rung
    Idle --> Sleep: Không rung
    Driving --> Sleep
    Alert --> Sleep
    Sleep --> CheckIGN
`;

const bleObdFlow = `sequenceDiagram
    participant FW as BLE task
    participant OBD as Adapter OBD2
    participant ADC as ADC fallback

    alt MAC đã lưu
        FW->>OBD: Reconnect nhanh
    else Chưa lưu MAC
        FW->>OBD: Scan + Pair
    end

    loop Chu kỳ lái xe
        FW->>OBD: Đọc PID + IGN
        OBD-->>FW: Telemetry
    end

    alt Timeout nhiều lần
        FW->>ADC: Fallback xác định IGN
    else Kết thúc phiên
        FW->>OBD: Ngắt BLE
    end
`;

const modemControlFlow = `sequenceDiagram
    participant FW as Modem task
    participant SIM as SIM7600CE-T

    FW->>SIM: Wake modem
    FW->>SIM: AT + CPIN + CEREG + CSQ

    alt Không phản hồi
        FW->>SIM: Reset PWRKEY và thử lại
    else Chưa vào mạng
        FW->>SIM: Retry đăng ký mạng
    else Driving
        FW->>SIM: Bật LTE/GNSS + gửi telemetry
    else Parking
        FW->>SIM: Giảm công suất + sleep
    end
`;

const powerPathFlow = `stateDiagram-v2
    direction LR
    [*] --> Sample
    Sample --> IgnCheck
    IgnCheck --> Main: IGN ON
    IgnCheck --> VoltCheck: IGN OFF
    VoltCheck --> Backup: U_batt thấp
    VoltCheck --> Recover: U_batt đủ
    Recover --> Main: >= Switch_ON
    Recover --> Hold: Chưa đổi ngưỡng
    Main --> Sample
    Backup --> Sample
    Hold --> Sample
`;

const deviceState = `stateDiagram-v2
    [*] --> Boot
    Boot --> Driving: IGN ON
    Boot --> Parking: IGN OFF
    Parking --> Alert: IMU rung
    Alert --> Parking: Xử lý xong
    Alert --> Driving: Xe tiếp tục chạy
    Driving --> Parking: Tắt máy
`;

const cloudArchitecture = `flowchart TB
    Device["Tracker Device"] --> EMQX["EMQX Broker"]
    EMQX --> Bridge["MQTT Bridge"]
    Bridge --> API["Backend API"]
    Bridge --> VM["VictoriaMetrics"]
    Bridge --> VL["VictoriaLogs"]
    API --> PG["PostgreSQL"]
    API --> Socket["Socket.IO"]
    Socket --> Dashboard["Web Dashboard"]
`;

const deviceToDashboardFlow = `sequenceDiagram
    participant Device as Tracker
    participant Broker as EMQX
    participant Bridge as MQTT Bridge
    participant API as Backend API
    participant Dash as Dashboard

    Device->>Broker: Publish telemetry
    Broker->>Bridge: Forward topic
    Bridge->>API: Push normalized event
    Bridge->>Bridge: Persist metric/log
    API-->>Dash: Realtime update (Socket.IO)
`;

const dualStorageStrategy = `flowchart LR
    Bridge["MQTT Bridge"]

    subgraph Hot["Hot Path - realtime"]
        VM["VictoriaMetrics"]
        WS["Socket.IO"]
    end

    subgraph Durable["Durable Path - nghiệp vụ"]
        PG["PostgreSQL"]
        API["Backend API"]
    end

    Bridge ----> VM
    Bridge ----> WS
    Bridge ----> PG
    API ----> PG
`;

const dbErd = `erDiagram
    USERS ||--o{ VEHICLES : quản_lý
    VEHICLES ||--o{ DEVICES : gắn
    VEHICLES ||--o{ TRIPS : phát_sinh
    TRIPS ||--o{ TRIP_EVENTS : gồm
    VEHICLES ||--o{ ALERTS : tạo_ra
    DEVICES ||--o{ COMMANDS : nhận

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
      string imei
    }
`;

const otaOrchestrationFlow = `sequenceDiagram
    actor Admin as Dashboard Admin
    participant API as Backend API
    participant DB as PostgreSQL
    participant Bridge as MQTT Bridge
    participant Broker as EMQX
    participant Device as Tracker

    Admin->>API: POST /devices/:id/ota
    API->>DB: Create OTA assignment
    API->>Bridge: Publish ota.assign
    Bridge->>Broker: devices/{id}/ota/assign
    Broker-->>Device: Deliver command
    Device->>Broker: ota.progress
    Broker->>Bridge: Forward progress
    Bridge->>DB: Persist status
    API-->>Admin: Push realtime status
`;

const frontendFsd = `mindmap
  root((Tracking Frontend))
    app
      router
      dashboard
      map
    features
      vehicles
      alerts
      trips
    components
      ui
      forms
      charts
    lib
      api
      realtime
      store
      utils
`;

const queryStoreFlow = `flowchart LR
    UI["Next.js Pages"] --> Query["TanStack Query"]
    UI --> Store["Zustand Store"]
    Query --> API["Backend API"]
    API --> PG["PostgreSQL"]
    API --> VM["VictoriaMetrics"]
    Socket["Socket.IO"] --> Store
    Query --> View["Map / Table / Chart"]
    Store --> View
`;

const authSequence = `sequenceDiagram
    actor User
    participant FE as Frontend
    participant BE as Backend API
    participant DB as PostgreSQL
    participant Store as Zustand

    User->>FE: Nhập email + mật khẩu
    FE->>BE: POST /auth/login
    BE->>DB: Kiểm tra tài khoản
    DB-->>BE: User + role
    BE-->>FE: Access token
    FE->>Store: Lưu session
`;

const mapIntegration = `flowchart LR
    API["Backend API"] --> Socket["Socket.IO"]
    Socket --> Store["Zustand Realtime Store"]
    Store --> Map["React Leaflet"]
    Store --> Sidebar["Sidebar thông tin xe"]
    Map --> Marker["Marker + Route"]
    Sidebar --> Marker
`;

const mapLayerBreakdown = `block-beta
    columns 2
    Root["Trang Map"]
    Tile["Tile Layer"]
    Marker["Marker Layer"]
    Route["Route Replay"]
    Fence["Geofence Layer"]
    Side["Sidebar"]
    Socket["Socket.IO"]
    Query["TanStack Query"]

    Root --> Tile
    Root --> Marker
    Root --> Route
    Root --> Fence
    Root --> Side
    Socket --> Marker
    Query --> Route
`;

const dashboardLayout = `block-beta
    columns 4
    Header["Header: filter | sync | profile"]
    Sidebar["Sidebar: danh sách xe"]
    Map["Map panel"]
    Widget["Widget panel"]
    Alert["Alert feed"]

    Header --> Sidebar
    Header --> Map
    Header --> Widget
    Sidebar --> Map
    Widget --> Alert
`;

const vehicleManagementLayout = `block-beta
    columns 4
    Header["Header: search + action"]
    Table["Data table phương tiện"]
    Filter["Filter trạng thái"]
    Form["Form thêm/sửa xe"]
    Detail["Detail panel"]

    Header --> Filter
    Filter --> Table
    Table --> Detail
    Header --> Form
`;

const realtimeMapLayout = `block-beta
    columns 4
    Header["Header map"]
    Fleet["Fleet list"]
    Map["Leaflet map"]
    Timeline["Timeline route"]
    Stats["Realtime stats"]

    Header --> Fleet
    Header --> Map
    Fleet --> Map
    Map --> Timeline
    Map --> Stats
`;

const dashboardWireframe = `flowchart TB
    H["Header"]
    subgraph Body["Main area"]
        direction LR
        L["Left: Vehicle list"]
        M["Center: Map"]
        R["Right: Metrics + Alerts"]
    end
    H --> L
    H --> M
    H --> R
`;

const uiPatterns = `mindmap
  root((UI Design System))
    Data Table
      sorting
      pagination
      inline status
    Form
      validation
      feedback
      role-based action
    Chart
      line
      bar
      radar
`;

const optimizedArchitecture = `flowchart LR
    Device["Tracker"] --> EMQX["EMQX"]
    EMQX --> Bridge["MQTT Bridge"]
    Bridge --> API["Backend API"]
    API --> Query["TanStack Query"]
    API --> Store["Realtime Store"]
    Query --> Dashboard["Dashboard"]
    Store --> Dashboard
    Bridge --> Obs["Metrics + Logs"]
`;

const ivmStructure = `mindmap
  root((iot-vehicle-tracking-system))
    backend
      api
      modules
      middleware
    frontend
      app
      features
      components
    mqtt-bridge
      parser
      publisher
    infra
      emqx
      postgres
      grafana
`;

const mqttBridgeFlow = `sequenceDiagram
    participant EMQX
    participant Bridge
    participant PG as PostgreSQL
    participant VM as VictoriaMetrics
    participant VL as VictoriaLogs
    participant WS as Socket.IO

    EMQX->>Bridge: telemetry/alert topic
    Bridge->>Bridge: validate + normalize payload
    Bridge->>PG: write business event
    Bridge->>VM: write telemetry metric
    Bridge->>VL: write audit log
    Bridge->>WS: push realtime event
`;

const backendFolder = `mindmap
  root((Tracking Backend))
    src
      core
      modules
      middleware
      shared
      routes
    tests
      unit
      integration
`;

const frontendFolder = `mindmap
  root((Tracking Frontend))
    src
      app
      features
      components
      lib
      hooks
      types
`;

const alertManagementLayout = `block-beta
    columns 4
    Header["Header: filter severity"]
    List["Danh sách cảnh báo"]
    Map["Map highlight geofence"]
    Detail["Alert detail"]
    History["History timeline"]

    Header --> List
    List --> Detail
    Detail --> Map
    Detail --> History
`;

const observabilityLayout = `flowchart LR
    Bridge["MQTT Bridge"] --> VM["VictoriaMetrics"]
    Bridge --> VL["VictoriaLogs"]
    VM --> Grafana["Grafana Dashboard"]
    VL --> Grafana
    Grafana --> Ops["DevOps / Monitoring"]
`;

const emqxDashboardLayout = `flowchart LR
    Device["Device clients"] --> EMQX["EMQX Broker"]
    EMQX --> Metric["Connection metrics"]
    EMQX --> Topic["Topic throughput"]
    EMQX --> Health["Broker health"]
    Metric --> UI["EMQX Dashboard"]
    Topic --> UI
    Health --> UI
`;

const labSetup = `block-beta
    columns 3
    Supply["Nguồn DC"]
    Tracker["Tracker prototype"]
    OBD["OBD2 simulator"]
    DMM["Đồng hồ đo"]
    Scope["Oscilloscope"]
    Laptop["Laptop thu log"]

    Supply --> Tracker
    OBD --> Tracker
    DMM --> Tracker
    Scope --> Tracker
    Tracker --> Laptop
`;

const vehicleInstall = `flowchart TB
    OBD["Cổng OBD2"] --> Dongle["vgate iCar Pro"]
    Dongle -. BLE .-> Tracker["Tracker trong cabin"]
    Tracker --> LTE["Anten LTE"]
    Tracker --> GNSS["Anten GNSS"]
`;

const testEnvironment = `flowchart LR
    Bench["Bench test phần cứng"] --> Network["4G/Wi-Fi test network"]
    Vehicle["Xe thử nghiệm"] --> Network
    Network --> Cloud["EMQX + Bridge + Backend"]
    Cloud --> Dashboard["Dashboard + Grafana"]
    Dashboard --> Report["Kết quả đo + log"]
`;

const currentCycleChart = `xychart-beta
    title "Dòng tiêu thụ theo chu kỳ hoạt động"
    x-axis ["Drive0", "Drive5", "Idle10", "Sleep20", "Deep25", "Alert32", "Park40"]
    y-axis "mA" 0 --> 450
    line [350, 360, 180, 15, 1, 380, 15]
`;

const backupVoltageChart = `xychart-beta
    title "Điện áp pin dự phòng theo thời gian"
    x-axis ["0h", "0.5h", "1h", "2h", "3h", "3.5h", "4h"]
    y-axis "V" 3.0 --> 4.3
    line [4.20, 4.05, 3.92, 3.78, 3.62, 3.45, 3.28]
`;

const temperatureCurrentChart = `xychart-beta
    title "Dòng tiêu thụ theo nhiệt độ môi trường"
    x-axis ["-10", "0", "25", "45", "60", "70"]
    y-axis "mA" 280 --> 430
    line [330, 338, 350, 355, 362, 410]
`;

const bleConnectDistChart = `xychart-beta
    title "Phân bố thời gian kết nối BLE OBD2"
    x-axis ["2-3s", "3-4s", "4-5s", "5-6s", "6-8s"]
    y-axis "Số lần" 0 --> 8
    bar [2, 7, 6, 3, 2]
`;

const gpsFixChart = `xychart-beta
    title "Thời gian bắt vệ tinh GPS"
    x-axis ["Cold-Min", "Cold-Avg", "Cold-Max", "Warm-Min", "Warm-Avg", "Warm-Max", "Hot-Min", "Hot-Avg", "Hot-Max"]
    y-axis "Giây" 0 --> 65
    bar [20, 30, 60, 3, 5, 12, 1, 2, 3]
`;

const mqttLatencyChart = `xychart-beta
    title "Phân bố độ trễ MQTT"
    x-axis ["4G-QoS0", "4G-QoS1", "Weak-QoS0", "Weak-QoS1"]
    y-axis "ms" 0 --> 1600
    bar [120, 180, 350, 500]
    bar [250, 380, 800, 1500]
`;

const apiLatencyChart = `xychart-beta
    title "P50/P95/P99 thời gian phản hồi API"
    x-axis ["Vehicles", "VehicleById", "Telemetry", "Alerts", "Auth"]
    y-axis "ms" 0 --> 380
    bar [38, 28, 45, 42, 100]
    bar [95, 72, 110, 100, 200]
    bar [150, 120, 180, 165, 350]
`;

const e2eLatencyChart = `xychart-beta
    title "Độ trễ end-to-end"
    x-axis ["Uplink", "EMQX-Bridge", "Bridge-VM", "Bridge-API", "WebSocket", "Total"]
    y-axis "ms" 0 --> 420
    bar [150, 5, 10, 5, 15, 185]
    bar [300, 15, 30, 12, 40, 400]
`;

const scalePerformanceChart = `xychart-beta
    title "Hiệu suất theo số lượng thiết bị đồng thời"
    x-axis ["10", "25", "50", "100", "200"]
    y-axis "Mức tải" 0 --> 60
    bar [5, 10, 18, 30, 55]
    bar [12, 15, 18, 25, 35]
    bar [15, 16, 18, 22, 35]
`;

const lighthouseChart = `xychart-beta
    title "Lighthouse Performance Audit"
    x-axis ["Performance", "Accessibility", "BestPractices", "SEO"]
    y-axis "Score" 0 --> 100
    bar [91, 94, 96, 92]
`;

const obdRealtimeLayout = `flowchart LR
    Stream["Socket realtime stream"] --> Panel["OBD2 chart panel"]
    Panel --> RPM["RPM"]
    Panel --> Speed["Speed"]
    Panel --> Coolant["Coolant Temp"]
    Filter["Time range filter"] --> Panel
`;

const geofenceLayout = `flowchart TB
    Map["Leaflet map"] --> Fence["Geofence polygon"]
    Vehicle["Vehicle marker"] --> Fence
    Fence --> Alert["Alert trigger"]
    Alert --> List["Danh sách cảnh báo"]
`;

const remoteCommandLayout = `flowchart LR
    User["Operator"] --> UI["Command UI"]
    UI --> API["Backend API"]
    API --> Bridge["MQTT Bridge"]
    Bridge --> Device["Tracker"]
    Device --> Ack["ACK/Result"]
    Ack --> UI
`;

const routeRecoveryLayout = `flowchart TB
    Loss["Mất kết nối tạm thời"] --> Buffer["Thiết bị lưu đệm local"]
    Buffer --> Recover["Khôi phục mạng"]
    Recover --> Replay["Bridge nhận replay"]
    Replay --> Map["Map cập nhật đầy đủ hành trình"]
`;

const designRadar = `radar-beta
    title "So sánh chỉ tiêu thiết kế và kết quả đạt được"
    axis GPS,Do_tre,Do_on_dinh,Tieu_thu,UX,Bao_mat
    curve straight
    "Thiết kế" [90,85,88,80,82,84]
    "Thực tế" [88,80,86,78,79,81]
`;

const hardwareElectricalOverview = `flowchart LR
    ADC["Voltage divider -> GPIO4"] --> MCU["ESP32-S3"]
    PWR["GPIO5/18/19"] --> MCU
    MCU --> Modem["SIM7600CE-T\nUART1"]
    MCU --> IMU["LIS3DH\nI2C"]
    MCU --> OBD["BLE OBD2"]
    MCU --> Logic["State machine"]
`;

const uartModemWiring = `flowchart LR
    TX["GPIO16 TX"] --> RXM["SIM RX"]
    RX["GPIO17 RX"] --> TXM["SIM TX"]
    PWRKEY["GPIO26 PWRKEY"] --> SIMPWR["SIM PWRKEY"]
    V4["Rail 4V"] --> VBAT["SIM VBAT"]
`;

const voltageDivider = `flowchart LR
    UBatt["Ắc quy xe"] --> R1["R1 100kΩ"]
    R1 --> Node["Nút chia áp"]
    Node --> ADC["GPIO4 ADC"]
    Node --> R2["R2 10kΩ"]
    R2 --> GND["GND"]
    ADC --> Rule["Firmware xác định IGN/LVD"]
`;

const wiringOverview = `flowchart TB
    MCU["ESP32-S3"]
    Power["Nguồn vào + power path"]
    Modem["SIM7600CE-T"]
    IMU["LIS3DH"]
    OBD["BLE OBD2"]

    Power --> MCU
    MCU --> Modem
    MCU --> IMU
    MCU --> OBD
`;

const buckStage = `flowchart LR
    Vin["Ắc quy"] --> Fuse["Cầu chì"]
    Fuse --> Buck["MP2482 Buck 5V"]
    Buck --> L["Cuộn cảm"]
    L --> Vout["Bus 5V"]
    Buck --> D["Schottky diode"]
    D --> Vout
`;

const boostStage = `flowchart LR
    Cell["Pin 21700"] --> BMS["BMS 1S"]
    BMS --> Boost["SX1308 Boost 5V"]
    Boost --> D["Schottky diode"]
    D --> Runtime["Bus runtime 5V"]
`;

const powerMux = `flowchart TB
    Main["Nhánh chính 5V"] --> ORing["Diode OR"]
    Backup["Nhánh backup 5V"] --> ORing
    ORing --> Load["Rail runtime"]
    FSM["Power FSM"] -. điều khiển .-> Main
    FSM -. điều khiển .-> Backup
`;

const chargerChain = `flowchart TB
    Bus5V["Bus 5V"] --> TP4056["TP4056"]
    TP4056 --> BMS["BMS"]
    BMS --> Cell["Pin 21700"]
    Cell --> Boost["SX1308"]
    Boost --> Runtime["Nguồn dự phòng"]
`;

const enclosureLayout = `block-beta
    columns 3
    MCU["ESP32-S3"]
    MODEM["SIM7600 + anten"]
    POWER["Buck/Boost/Charge"]
    CELL["Pin 21700"]
    OBD["OBD2 / BLE"]
    PORT["USB debug"]

    POWER --> MCU
    POWER --> MODEM
    POWER --> CELL
    MCU --> OBD
    MCU --> PORT
`;

const assemblyFlow = `flowchart LR
    A["B1: Kiểm tra linh kiện"] --> B["B2: Lắp nhánh nguồn"]
    B --> C["B3: Gắn ESP32-S3"]
    C --> D["B4: Đấu modem + IMU + ADC"]
    D --> E["B5: Nạp firmware test"]
    E --> F["B6: Đóng vỏ"]
`;

const prototypeLayout = `block-beta
    columns 3
    Vin["Nguồn vào"]
    Buck["MP2482/XL1509"]
    MCU["ESP32-S3"]
    Modem["SIM7600"]
    IMU["LIS3DH"]
    Charge["TP4056+BMS"]
    Cell["Pin 21700"]

    Vin --> Buck
    Buck --> MCU
    MCU --> Modem
    MCU --> IMU
    Buck --> Charge
    Charge --> Cell
`;

const obdPlacement = `flowchart TB
    Port["Cổng OBD2 dưới taplo"] --> Dongle["vgate iCar Pro"]
    Dongle -. BLE .-> Tracker["Tracker trong cabin"]
    Tracker --> Note["Không cần cắm tracker trực tiếp OBD2"]
`;

const vehicleInstallation = `flowchart TB
    Tracker["Tracker dưới taplo"] --> LTE["Anten LTE"]
    Tracker --> GNSS["Anten GNSS"]
    Tracker -. BLE .-> OBD["OBD2 adapter"]
    OBD --> Port["Cổng OBD2"]
`;

const installChecklist = `flowchart LR
    C1["Kiểm tra nguồn 12V/24V"] --> C2["Kiểm tra BLE OBD2"]
    C2 --> C3["Kiểm tra GNSS fix"]
    C3 --> C4["Kiểm tra LTE/MQTT"]
    C4 --> C5["Kiểm tra power path"]
    C5 --> C6["Kiểm tra IMU wake/sleep"]
`;

const firmwareImplementationFlow = `stateDiagram-v2
    [*] --> INIT
    INIT --> CHECK_IGN
    CHECK_IGN --> DRIVING: IGN ON
    CHECK_IGN --> IDLE: IGN OFF
    IDLE --> ALERT: có rung
    IDLE --> HEARTBEAT: không rung
    DRIVING --> SLEEP
    ALERT --> SLEEP
    HEARTBEAT --> SLEEP
    SLEEP --> CHECK_IGN
`;

const otaLifecycleFlow = `stateDiagram-v2
    [*] --> Assigned
    Assigned --> Downloading
    Downloading --> Rebooting: image OK
    Downloading --> Failed: lỗi tải/hash
    Rebooting --> Confirming
    Confirming --> Success: app hợp lệ
    Confirming --> RolledBack: lỗi xác nhận
    Success --> [*]
    Failed --> [*]
    RolledBack --> [*]
`;

const appendixGantt = `gantt
    title Kế hoạch thực hiện dự án (24 tuần)
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m

    section Phần cứng
    Nghiên cứu và thiết kế         :a1, 2025-09-01, 28d

    section Firmware
    Setup driver nền tảng          :a2, 2025-09-15, 21d
    BLE OBD2 và power FSM          :a3, after a2, 35d

    section Cloud và Backend
    EMQX + DB + Docker             :a4, 2025-09-29, 28d
    Backend API + MQTT Bridge      :a5, 2025-10-13, 42d

    section Frontend
    Dashboard + bản đồ + cảnh báo  :a6, 2025-11-10, 42d

    section Tích hợp
    Tích hợp hệ thống              :a7, 2025-12-22, 42d
    Viết báo cáo                   :a8, 2026-01-19, 28d
`;

export const diagramByFileName = {
    "01-chuong-1-gioi-thieu-hinh-1-1.svg": problemSolution,
    "01-chuong-1-gioi-thieu-hinh-1-2.svg": projectPhases,
    "01-chuong-1-gioi-thieu-hinh-1-3.svg": systemArchitecture,
    "01-chuong-1-gioi-thieu-hinh-1-4.svg": powerModes,
    "01-chuong-1-gioi-thieu-hinh-1-5.svg": roadmapPlan,

    "02-chuong-2-phan-tich-hinh-2-1.svg": dataArchitecture,

    "03-chuong-3-giai-phap-phan-cung-hinh-3-1.svg": trackerBlock,
    "03-chuong-3-giai-phap-phan-cung-hinh-3-2.svg": bleObdSequence,
    "03-chuong-3-giai-phap-phan-cung-hinh-3-3.svg": lis3dhWiring,
    "03-chuong-3-giai-phap-phan-cung-hinh-3-4.svg": powerManagement,

    "04-chuong-3-giai-phap-firmware-hinh-3-5.svg": firmwareLayers,
    "04-chuong-3-giai-phap-firmware-hinh-3-6.svg": taskInteraction,
    "04-chuong-3-giai-phap-firmware-hinh-3-7.svg": firmwareMainFlow,
    "04-chuong-3-giai-phap-firmware-hinh-3-8.svg": bleObdFlow,
    "04-chuong-3-giai-phap-firmware-hinh-3-9.svg": modemControlFlow,
    "04-chuong-3-giai-phap-firmware-hinh-3-10.svg": powerPathFlow,
    "04-chuong-3-giai-phap-firmware-hinh-3-11.svg": deviceState,

    "05-chuong-3-giai-phap-backend-hinh-3-12.svg": cloudArchitecture,
    "05-chuong-3-giai-phap-backend-hinh-3-13.svg": dualStorageStrategy,
    "05-chuong-3-giai-phap-backend-hinh-3-14.svg": dbErd,
    "05-chuong-3-giai-phap-backend-hinh-3-14a.svg": otaOrchestrationFlow,

    "06-chuong-3-giai-phap-frontend-hinh-3-15.svg": frontendFsd,
    "06-chuong-3-giai-phap-frontend-hinh-3-16.svg": authSequence,
    "06-chuong-3-giai-phap-frontend-hinh-3-17.svg": dashboardLayout,
    "06-chuong-3-giai-phap-frontend-hinh-3-18.svg": vehicleManagementLayout,
    "06-chuong-3-giai-phap-frontend-hinh-3-19.svg": mapIntegration,
    "06-chuong-3-giai-phap-frontend-hinh-3-20.svg": realtimeMapLayout,
    "06-chuong-3-giai-phap-frontend-hinh-3-21.svg": dashboardWireframe,
    "06-chuong-3-giai-phap-frontend-hinh-3-22.svg": uiPatterns,
    "06-chuong-3-giai-phap-frontend-hinh-3-23.svg": optimizedArchitecture,

    "07-chuong-4-trien-khai-hardware-hinh-4-1.svg": trackerBlock,
    "07-chuong-4-trien-khai-hardware-hinh-4-2.svg": uartModemWiring,
    "07-chuong-4-trien-khai-hardware-hinh-4-3.svg": voltageDivider,
    "07-chuong-4-trien-khai-hardware-hinh-4-4.svg": wiringOverview,
    "07-chuong-4-trien-khai-hardware-hinh-4-5.svg": hardwareElectricalOverview,
    "07-chuong-4-trien-khai-hardware-hinh-4-6.svg": powerManagement,
    "07-chuong-4-trien-khai-hardware-hinh-4-7.svg": buckStage,
    "07-chuong-4-trien-khai-hardware-hinh-4-8.svg": boostStage,
    "07-chuong-4-trien-khai-hardware-hinh-4-9.svg": powerMux,
    "07-chuong-4-trien-khai-hardware-hinh-4-10.svg": chargerChain,
    "07-chuong-4-trien-khai-hardware-hinh-4-11.svg": enclosureLayout,
    "07-chuong-4-trien-khai-hardware-hinh-4-12.svg": assemblyFlow,
    "07-chuong-4-trien-khai-hardware-hinh-4-13.svg": prototypeLayout,
    "07-chuong-4-trien-khai-hardware-hinh-4-14.svg": obdPlacement,
    "07-chuong-4-trien-khai-hardware-hinh-4-15.svg": vehicleInstallation,
    "07-chuong-4-trien-khai-hardware-hinh-4-16.svg": installChecklist,

    "09-chuong-4-trien-khai-cloud-hinh-4-15.svg": cloudArchitecture,
    "09-chuong-4-trien-khai-cloud-hinh-4-16.svg": ivmStructure,
    "09-chuong-4-trien-khai-cloud-hinh-4-17.svg": mqttBridgeFlow,
    "09-chuong-4-trien-khai-cloud-hinh-4-18.svg": backendFolder,
    "09-chuong-4-trien-khai-cloud-hinh-4-19.svg": frontendFolder,
    "09-chuong-4-trien-khai-cloud-hinh-4-20.svg": dashboardLayout,
    "09-chuong-4-trien-khai-cloud-hinh-4-21.svg": vehicleManagementLayout,
    "09-chuong-4-trien-khai-cloud-hinh-4-22.svg": realtimeMapLayout,
    "09-chuong-4-trien-khai-cloud-hinh-4-23.svg": alertManagementLayout,
    "09-chuong-4-trien-khai-cloud-hinh-4-24.svg": observabilityLayout,
    "09-chuong-4-trien-khai-cloud-hinh-4-25.svg": emqxDashboardLayout,

    "10-chuong-4-ket-qua-do-luong-hinh-4-20.svg": labSetup,
    "10-chuong-4-ket-qua-do-luong-hinh-4-21.svg": vehicleInstall,
    "10-chuong-4-ket-qua-do-luong-hinh-4-22.svg": testEnvironment,
    "10-chuong-4-ket-qua-do-luong-hinh-4-23.svg": currentCycleChart,
    "10-chuong-4-ket-qua-do-luong-hinh-4-24.svg": backupVoltageChart,
    "10-chuong-4-ket-qua-do-luong-hinh-4-25.svg": temperatureCurrentChart,
    "10-chuong-4-ket-qua-do-luong-hinh-4-26.svg": bleConnectDistChart,
    "10-chuong-4-ket-qua-do-luong-hinh-4-27.svg": gpsFixChart,
    "10-chuong-4-ket-qua-do-luong-hinh-4-28.svg": mqttLatencyChart,
    "10-chuong-4-ket-qua-do-luong-hinh-4-29.svg": apiLatencyChart,
    "10-chuong-4-ket-qua-do-luong-hinh-4-30.svg": e2eLatencyChart,
    "10-chuong-4-ket-qua-do-luong-hinh-4-31.svg": scalePerformanceChart,
    "10-chuong-4-ket-qua-do-luong-hinh-4-32.svg": lighthouseChart,
    "10-chuong-4-ket-qua-do-luong-hinh-4-33.svg": realtimeMapLayout,
    "10-chuong-4-ket-qua-do-luong-hinh-4-34.svg": obdRealtimeLayout,
    "10-chuong-4-ket-qua-do-luong-hinh-4-35.svg": geofenceLayout,
    "10-chuong-4-ket-qua-do-luong-hinh-4-36.svg": remoteCommandLayout,
    "10-chuong-4-ket-qua-do-luong-hinh-4-37.svg": routeRecoveryLayout,
    "10-chuong-4-ket-qua-do-luong-hinh-4-38.svg": designRadar,

    "thesis-05-chuong-3-giai-phap-backend-01.svg": deviceToDashboardFlow,
    "thesis-05-chuong-3-giai-phap-backend-02.svg": dualStorageStrategy,
    "thesis-05-chuong-3-giai-phap-backend-03.svg": dbErd,
    "thesis-05-chuong-3-giai-phap-backend-04.svg": otaOrchestrationFlow,

    "thesis-08-chuong-4-trien-khai-firmware-01.svg": firmwareImplementationFlow,
    "thesis-08-chuong-4-trien-khai-firmware-02.svg": otaLifecycleFlow,

    "thesis-14-phu-luc-01.svg": appendixGantt,

    "thesis-99-bao-cao-thesis-hoan-chinh-01.svg": trackerBlock,
    "thesis-99-bao-cao-thesis-hoan-chinh-02.svg": lis3dhWiring,
    "thesis-99-bao-cao-thesis-hoan-chinh-03.svg": powerManagement,
    "thesis-99-bao-cao-thesis-hoan-chinh-04.svg": deviceToDashboardFlow,
    "thesis-99-bao-cao-thesis-hoan-chinh-05.svg": queryStoreFlow,
    "thesis-99-bao-cao-thesis-hoan-chinh-06.svg": mapLayerBreakdown,
    "thesis-99-bao-cao-thesis-hoan-chinh-07.svg": prototypeLayout,
    "thesis-99-bao-cao-thesis-hoan-chinh-08.svg": uartModemWiring,
    "thesis-99-bao-cao-thesis-hoan-chinh-09.svg": powerMux,
};

export const mermaidDiagrams = Object.entries(diagramByFileName).map(([name, code]) => ({ name, code }));
