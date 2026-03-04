### 3.1.4. Phân tích và lựa chọn công nghệ Frontend

#### 3.1.4.1. Đặt vấn đề cho giải pháp Frontend

Giao diện người dùng (Frontend) là lớp tương tác trực tiếp giữa người vận hành và hệ thống IoT giám sát phương tiện. Do đó, bài toán thiết kế frontend cần đồng thời đáp ứng các yêu cầu sau:

- **Hiển thị thời gian thực ổn định**: bản đồ, trạng thái thiết bị và cảnh báo phải cập nhật liên tục với độ trễ thấp.
- **Khả năng mở rộng theo tính năng nghiệp vụ**: quản lý xe, chuyến đi, geofence, cảnh báo, báo cáo cần dễ mở rộng.
- **Hiệu năng và trải nghiệm người dùng**: tải trang nhanh, điều hướng mượt, responsive tốt trên desktop/mobile.
- **Dễ triển khai production**: build và đóng gói Docker thuận lợi cho mô hình vận hành đa dịch vụ.

#### 3.1.4.2. So sánh các phương án công nghệ Frontend

[Bảng 3.23A: So sánh các phương án công nghệ frontend tổng thể]

| Phương án | Mô tả stack | Ưu điểm | Hạn chế | Mức phù hợp |
| --------- | ----------- | ------- | ------- | ----------- |
| **PA-FE1: Vite + React CSR** | React + Vite + client-side routing | Build nhanh, cấu hình linh hoạt | SEO/first load kém hơn SSR, cần tự lắp ghép nhiều thành phần | Trung bình |
| **PA-FE2: Nuxt (Vue)** | Vue + Nuxt SSR/SSG | SSR tốt, cấu trúc rõ | Khác hệ sinh thái React đang dùng ở dự án, chi phí chuyển đổi cao | Trung bình |
| **PA-FE3: Next.js + React (Đã chọn)** | Next.js 15 + React 19 + App Router | SSR/RSC tốt, hệ sinh thái lớn, tối ưu production, tích hợp realtime thuận lợi | Độ phức tạp framework cao hơn CSR thuần | **Cao** |

#### 3.1.4.3. Chọn giải pháp Frontend

Đồ án chọn **PA-FE3: Next.js 15 + React 19** làm nền tảng frontend chính.

Lý do lựa chọn:

- **Phù hợp yêu cầu realtime + dashboard phức hợp**: kết hợp tốt giữa REST cache và WebSocket.
- **Hiệu năng tải trang tốt**: App Router và khả năng render phía server cải thiện trải nghiệm ban đầu.
- **Mở rộng tính năng thuận lợi**: dễ tổ chức theo module (Feature-Sliced Design).
- **Sẵn sàng triển khai production**: hỗ trợ build/standalone output và đóng gói Docker rõ ràng.

### 3.2.4. Giải pháp Frontend

Phần này trình bày các giải pháp thiết kế, lựa chọn công nghệ và kiến trúc ứng dụng web theo phương án đã chọn ở mục 3.1.4.

#### 3.2.4.1. Lựa chọn công nghệ Frontend (Technology Selection)

##### a) Framework ứng dụng web

Để lựa chọn framework phù hợp cho lớp giao diện, nhóm so sánh Next.js, Nuxt.js và Vite + React theo các tiêu chí hiệu năng, khả năng mở rộng và trải nghiệm phát triển.

[Bảng 3.24: So sánh framework Frontend]

| Tiêu chí             | Next.js 15                                  | Nuxt.js 3               | Vite + React                       |
| -------------------- | ------------------------------------------- | ----------------------- | ---------------------------------- |
| Ngôn ngữ cơ sở       | React 19 + TypeScript                       | Vue 3 + TypeScript      | React + TypeScript                 |
| Rendering            | SSR, SSG, ISR, RSC                          | SSR, SSG, ISR           | CSR (chỉ client-side)              |
| App Router           | Có (App Router với React Server Components) | Có (File-based routing) | Không có sẵn, cần thư viện bổ sung |
| SEO & First Load     | Tốt (Server-side rendering)                 | Tốt                     | Kém (chỉ client-side rendering)    |
| Hệ sinh thái         | Rất lớn (React ecosystem)                   | Lớn (Vue ecosystem)     | Lớn (React ecosystem)              |
| Real-time support    | Tốt (Socket.IO, Server Actions)             | Tốt                     | Tốt                                |
| Hiệu năng            | Cao (Turbopack, Partial Prerendering)       | Cao (Nitro engine)      | Cao (Vite bundler)                 |
| Docker deployment    | Có sẵn Dockerfile, standalone output        | Có sẵn                  | Cần cấu hình thủ công              |
| Cộng đồng & tài liệu | Rất lớn                                     | Lớn                     | Lớn                                |

**Kết luận lựa chọn:** Next.js 15 được chọn làm framework chính vì các lý do sau:

- **React Server Components (RSC):** Cho phép render một phần trên server, giảm kích thước JavaScript gửi về client và tăng tốc độ tải trang đầu tiên (First Contentful Paint).
- **App Router:** Cơ chế định tuyến dựa trên thư mục (file-based routing) đơn giản hóa việc tổ chức cấu trúc trang và layout lồng nhau (nested layouts).
- **Hệ sinh thái React:** Tận dụng được hệ sinh thái cực kỳ phong phú của React bao gồm TanStack Query, Zustand, Leaflet, ECharts và hàng ngàn thư viện bổ sung.
- **TypeScript tích hợp:** Hỗ trợ TypeScript từ gốc, đảm bảo an toàn kiểu dữ liệu xuyên suốt ứng dụng.
- **Production-ready:** Có sẵn cơ chế tối ưu hóa cho môi trường sản xuất như Image Optimization, Code Splitting, và Standalone Output cho Docker.

##### b) Thư viện giao diện (UI Component Library)

Hệ thống sử dụng shadcn/ui kết hợp với Radix UI làm nền tảng xây dựng giao diện. Đây không phải thư viện component truyền thống, mà là bộ sưu tập component có thể tùy chỉnh hoàn toàn và được sao chép trực tiếp vào dự án.

**Đặc điểm nổi bật:**

- **Radix UI Primitives:** Cung cấp các component cơ bản đã xử lý accessibility (ARIA attributes), keyboard navigation và focus management.
- **Tailwind CSS v4:** Hệ thống utility-first CSS với CSS Variables cho phép tùy chỉnh giao diện nhanh chóng mà không cần viết CSS truyền thống.
- **Class Variance Authority (CVA):** Quản lý các biến thể (variants) của component một cách có hệ thống.
- **Oklch Color Space:** Sử dụng hệ màu oklch hiện đại cho độ chính xác màu sắc cao hơn và hỗ trợ chuyển đổi Light/Dark theme mượt mà.

##### c) Quản lý trạng thái (State Management)

Hệ thống áp dụng chiến lược tách biệt giữa trạng thái client và trạng thái server:

[Bảng 3.25: Chiến lược quản lý trạng thái]

| Loại trạng thái | Thư viện         | Mục đích                        | Ví dụ                                            |
| --------------- | ---------------- | ------------------------------- | ------------------------------------------------ |
| Client state    | Zustand 5        | Trạng thái UI và authentication | Token phiên đăng nhập, trạng thái sidebar, theme |
| Server state    | TanStack Query 5 | Dữ liệu từ API server           | Danh sách xe, chuyến đi, cảnh báo                |
| URL state       | nuqs             | Trạng thái đồng bộ với URL      | Bộ lọc, phân trang, tab đang chọn                |
| Real-time state | Socket.IO Client | Dữ liệu thời gian thực          | Vị trí xe, dữ liệu telemetry                     |

**Kết luận:** Zustand được chọn vì API đơn giản, kích thước cực nhỏ (~1.1 KB) và phù hợp với yêu cầu của hệ thống nơi token phiên đăng nhập chỉ lưu trong bộ nhớ (memory-only, không persist ra localStorage) nhằm tăng tính bảo mật.

##### d) Thư viện bản đồ

[Bảng 3.26: So sánh thư viện bản đồ]

| Tiêu chí                   | Leaflet.js                     | Mapbox GL JS                 | Google Maps JS API     |
| -------------------------- | ------------------------------ | ---------------------------- | ---------------------- |
| Giấy phép                  | MIT (mã nguồn mở)              | Proprietary (có free tier)   | Proprietary (trả phí)  |
| Chi phí                    | Miễn phí                       | Miễn phí đến 50K loads/tháng | 0.007 USD/load sau 28K |
| Hiệu năng với nhiều marker | Tốt (với MarkerCluster)        | Rất tốt (WebGL rendering)    | Tốt                    |
| Tùy chỉnh marker           | Cao                            | Cao                          | Trung bình             |
| Offline/Self-hosted tiles  | Hỗ trợ                         | Không                        | Không                  |
| React integration          | react-leaflet (trưởng thành)   | react-map-gl                 | @react-google-maps/api |
| Vẽ geofence                | @geoman-io/leaflet-geoman-free | mapbox-gl-draw               | Drawing Manager        |

**Kết luận:** Leaflet.js được chọn vì hoàn toàn miễn phí (MIT license), hỗ trợ tự host tile server cho môi trường không có Internet công cộng, và có hệ sinh thái plugin phong phú (MarkerCluster, Geoman cho vẽ geofence). Điều này đặc biệt phù hợp với hệ thống IoT có thể triển khai trong môi trường private network.

#### 3.2.4.2. Kiến trúc ứng dụng web (Web Application Architecture)

##### a) Mô hình kiến trúc Feature-Sliced Design

Ứng dụng Frontend được tổ chức theo mô hình Feature-Sliced Design (FSD), trong đó mỗi tính năng nghiệp vụ được đóng gói thành một module độc lập bao gồm components, hooks, types và utils.

```
src/
 +-- app/                          # Next.js App Router (routing & layouts)
 |    +-- layout.tsx               # Root layout
 |    +-- dashboard/               # Protected routes
 |         +-- layout.tsx          # Dashboard layout (sidebar + header)
 |         +-- page.tsx            # Dashboard overview
 |         +-- vehicles/           # Vehicle pages
 |         +-- trips/              # Trip pages
 |         +-- map/                # Real-time map
 |         +-- alerts/             # Alert pages
 |         +-- geofences/          # Geofence pages
 |
 +-- features/                     # Feature modules (FSD)
 |    +-- vehicles/
 |    |    +-- components/         # Vehicle-specific components
 |    |    +-- hooks/              # useVehicles, useVehicle
 |    |    +-- types.ts            # Vehicle types
 |    +-- trips/
 |    +-- alerts/
 |    +-- map/
 |
 +-- components/                   # Shared components
 |    +-- ui/                      # shadcn/ui (Button, Card, Table, ...)
 |    +-- layout/                  # Sidebar, Header, Breadcrumbs
 |    +-- map/                     # VehicleMap, RouteMap, GeofenceMap
 |    +-- charts/                  # SpeedChart, BatteryChart
 |    +-- forms/                   # FormInput, FormSelect, FormDatePicker
 |
 +-- lib/                          # Utilities & infrastructure
 |    +-- api/                     # HTTP client & API modules
 |    +-- realtime/                # Socket.IO client
 |    +-- store/                   # Zustand stores (auth, UI)
 |    +-- utils/                   # Helper functions
 |
 +-- types/                        # Global TypeScript types
```

![Hình 3.15 - Sơ đồ kiến trúc Feature-Sliced Design của ứng dụng Frontend](./assets/figures/06-chuong-3-giai-phap-frontend-hinh-3–15.jpg)

*Hình 3.15: Sơ đồ kiến trúc Feature-Sliced Design của ứng dụng Frontend*

> Nguồn: Hình vẽ của tác giả

**Nguyên tắc tổ chức:**

- **Co-location:** Các file liên quan đến một tính năng được đặt cùng thư mục, giảm thời gian tìm kiếm và bảo trì.
- **Encapsulation:** Mỗi feature module export một public API rõ ràng, các module khác chỉ truy cập thông qua hooks và components đã export.
- **Separation of Concerns:** Tách biệt rõ ràng giữa routing (app/), logic nghiệp vụ (features/), giao diện dùng lại (components/) và hạ tầng (lib/).

##### b) Luồng dữ liệu trong ứng dụng

Luồng dữ liệu trong ứng dụng Frontend tuân theo mô hình một chiều (unidirectional data flow), đồng thời kết hợp ba nguồn dữ liệu chính:

```
                   +-------------------+
                   |   Next.js Pages   |
                   |   (App Router)    |
                   +--------+----------+
                            |
              +-------------+-------------+
              |             |             |
     +--------v---+  +-----v------+  +---v-----------+
     | TanStack   |  | Zustand    |  | Socket.IO     |
     | Query      |  | Store      |  | Client        |
     | (REST API) |  | (Client)   |  | (Real-time)   |
     +--------+---+  +-----+------+  +---+-----------+
              |             |             |
              +-------------+-------------+
                            |
                   +--------v----------+
                   |  Backend API      |
                   |  (Express 3000)   |
                   +-------------------+
```

1. **REST API (TanStack Query):** Dữ liệu CRUD (danh sách xe, chuyến đi, cảnh báo) được lấy từ Backend qua HTTP và cache bởi TanStack Query với cơ chế stale-while-revalidate.
2. **Client State (Zustand):** Trạng thái giao diện như phiên đăng nhập, trạng thái sidebar, theme được quản lý tại client mà không cần gọi API.
3. **Real-time (Socket.IO):** Dữ liệu vị trí xe và telemetry được nhận theo thời gian thực qua WebSocket. Khi kết nối WebSocket đang hoạt động, TanStack Query sẽ tự động tắt polling để tránh trùng lặp dữ liệu.

##### c) Cơ chế xác thực và bảo vệ route

Hệ thống Frontend sử dụng cơ chế xác thực dựa trên session token, không sử dụng JWT:

1. **Đăng nhập:** Người dùng nhập email và mật khẩu, Backend trả về session token.
2. **Lưu trữ token:** Token chỉ được lưu trong bộ nhớ Zustand (memory-only), KHÔNG lưu vào localStorage hay sessionStorage, nhằm giảm thiểu rủi ro XSS.
3. **Gửi request:** Mọi request HTTP tự động đính kèm token vào header `Authorization: Bearer <token>`.
4. **AuthGuard:** Component `AuthGuard` bao bọc toàn bộ khu vực `/dashboard/*`, tự động chuyển hướng về trang đăng nhập nếu chưa xác thực hoặc token hết hạn.
5. **Auto-refresh:** Khi token sắp hết hạn, hệ thống tự động yêu cầu Backend cấp token mới mà không cần người dùng đăng nhập lại.

![Hình 3.16 - Biểu đồ trình tự (Sequence Diagram) luồng xác thực người dùng](./assets/figures/06-chuong-3-giai-phap-frontend-hinh-3–16.png)

*Hình 3.16: Biểu đồ trình tự (Sequence Diagram) luồng xác thực người dùng*

> Nguồn: Hình vẽ của tác giả

#### 3.2.4.3. Thiết kế các trang chức năng chính (Main Feature Pages)

##### a) Trang tổng quan (Dashboard)

Trang Dashboard là điểm vào chính sau khi đăng nhập, cung cấp cái nhìn tổng thể về trạng thái hệ thống:

- **Stat Cards:** Hiển thị các chỉ số quan trọng: tổng số xe đang hoạt động, số chuyến đi trong ngày, số cảnh báo chưa xử lý, số vi phạm mới.
- **Bản đồ mini:** Hiển thị vị trí tất cả xe đang hoạt động trên bản đồ thu nhỏ.
- **Bảng cảnh báo gần đây:** Danh sách 10 cảnh báo mới nhất với badge mức độ nghiêm trọng (low, medium, high, critical).
- **Biểu đồ thống kê:** Biểu đồ số chuyến đi theo ngày và phân loại cảnh báo theo loại.

![Hình 3.17 - Giao diện trang Dashboard tổng quan](./assets/figures/06-chuong-3-giai-phap-frontend-hinh-3–17.png)

*Hình 3.17: Giao diện trang Dashboard tổng quan*

> Nguồn: Giao diện ứng dụng IVM26 (hình chụp màn hình)

##### b) Quản lý phương tiện (Vehicle Management)

**Trang danh sách (`/dashboard/vehicles`):**

| Cột                | Mô tả                                  | Chức năng           |
| ------------------ | -------------------------------------- | ------------------- |
| Biển số xe         | Số đăng ký phương tiện                 | Tìm kiếm            |
| Hãng/Model         | Thương hiệu và đời xe                  | Lọc                 |
| Trạng thái         | Active, Inactive, Maintenance, Retired | Lọc theo trạng thái |
| Thiết bị           | Mã thiết bị IoT gắn kèm                | Liên kết            |
| Lần cuối hoạt động | Thời điểm nhận dữ liệu gần nhất        | Sắp xếp             |
| Thao tác           | Xem, Sửa, Xóa, Xem trên bản đồ         | Nút hành động       |

**Trang chi tiết (`/dashboard/vehicles/[id]`):** Hiển thị thông tin đầy đủ của phương tiện bao gồm thông tin cơ bản, vị trí hiện tại trên bản đồ, trạng thái thiết bị IoT, các cảnh báo đang hoạt động, lịch sử chuyến đi và lịch sử bảo trì.

![Hình 3.18 - Giao diện trang quản lý phương tiện](./assets/figures/06-chuong-3-giai-phap-frontend-hinh-3–18.jpg)

*Hình 3.18: Giao diện trang quản lý phương tiện*

> Nguồn: Giao diện ứng dụng IVM26 (hình chụp màn hình)

##### c) Quản lý chuyến đi, cảnh báo và vùng địa lý

Trang quản lý chuyến đi cung cấp lịch sử và chi tiết từng chuyến, gồm tuyến đường trên bản đồ, biểu đồ tốc độ theo thời gian và timeline sự kiện. Trang cảnh báo tổng hợp cảnh báo theo badge mức độ nghiêm trọng và hỗ trợ xử lý hàng loạt. Trang geofence cho phép vẽ hình tròn, đa giác hoặc hình chữ nhật trực tiếp trên bản đồ bằng Leaflet Geoman.

[Bảng 3.27: Ma trận các trang chức năng chính]

| Trang       | Đường dẫn                  | Chức năng chính                         | Real-time                |
| ----------- | -------------------------- | --------------------------------------- | ------------------------ |
| Dashboard   | `/dashboard`               | Tổng quan hệ thống, stat cards, biểu đồ | Có (cập nhật số liệu)    |
| Bản đồ      | `/dashboard/map`           | Theo dõi tất cả xe thời gian thực       | Có (vị trí xe)           |
| Phương tiện | `/dashboard/vehicles`      | CRUD xe, trạng thái, lịch sử            | Có (trạng thái xe)       |
| Chuyến đi   | `/dashboard/trips`         | Lịch sử chuyến đi, tuyến đường          | Không                    |
| Cảnh báo    | `/dashboard/alerts`        | Xem, xử lý cảnh báo                     | Có (cảnh báo mới)        |
| Vi phạm     | `/dashboard/violations`    | Quản lý vi phạm tốc độ                  | Không                    |
| Thiết bị    | `/dashboard/devices`       | Quản lý thiết bị IoT                    | Có (trạng thái thiết bị) |
| Vùng địa lý | `/dashboard/geofences`     | Tạo, sửa geofence trên bản đồ           | Không                    |
| Bảo trì     | `/dashboard/maintenance`   | Lịch sử bảo trì phương tiện             | Không                    |
| Thông báo   | `/dashboard/notifications` | Cấu hình Telegram, Email                | Không                    |
| Cài đặt     | `/dashboard/settings`      | Hồ sơ, quản lý người dùng               | Không                    |

#### 3.2.4.4. Tích hợp bản đồ thời gian thực (Real-time Map Integration)

##### a) Kiến trúc tích hợp bản đồ

Trang bản đồ thời gian thực (`/dashboard/map`) là tính năng cốt lõi của hệ thống giám sát phương tiện. Kiến trúc tích hợp bản đồ bao gồm ba lớp chính:

```
+------------------------------------------+
|         React Leaflet Map Layer          |
|  +------------------------------------+  |
|  |  Tile Layer (OpenStreetMap tiles)   |  |
|  +------------------------------------+  |
|  |  Vehicle Markers Layer              |  |
|  |  (real-time position updates)       |  |
|  +------------------------------------+  |
|  |  Geofence Overlay Layer             |  |
|  |  (polygon/circle visualization)     |  |
|  +------------------------------------+  |
|  |  Route Polyline Layer               |  |
|  |  (trip route replay)               |  |
|  +------------------------------------+  |
+------------------------------------------+
         |                    ^
         | subscribe          | location events
         v                    |
+------------------------------------------+
|      Socket.IO Client (WebSocket)        |
|  - Connect with namespace /dashboard     |
|  - Subscribe vehicle location events     |
|  - Receive position data in real-time    |
+------------------------------------------+
         |
         v
+------------------------------------------+
|      Backend API Server (Express)        |
|  - Receive telemetry from MQTT Bridge    |
|  - Broadcast via Socket.IO              |
+------------------------------------------+
```

![Hình 3.19 - Kiến trúc tích hợp bản đồ thời gian thực](./assets/figures/06-chuong-3-giai-phap-frontend-hinh-3–19.png)

*Hình 3.19: Kiến trúc tích hợp bản đồ thời gian thực*

> Nguồn: Hình vẽ của tác giả

##### b) Cơ chế cập nhật vị trí thời gian thực

Quy trình cập nhật vị trí xe trên bản đồ diễn ra như sau:

1. **Thiết bị IoT** gửi dữ liệu GPS qua MQTT đến EMQX Broker.
2. **MQTT Bridge** nhận và xử lý dữ liệu, lưu vào VictoriaMetrics, đồng thời chuyển tiếp đến Backend.
3. **Backend** phát sự kiện `vehicle:{id}:location` qua Socket.IO đến tất cả client đang subscribe.
4. **Frontend** nhận sự kiện, cập nhật tọa độ marker trên bản đồ. Sử dụng kỹ thuật nội suy (interpolation) để marker di chuyển mượt mà giữa hai điểm tọa độ liên tiếp.

**Tối ưu hiệu năng bản đồ:**

- **Marker Clustering:** Sử dụng `react-leaflet-cluster` để gom nhóm các marker gần nhau khi zoom out, giảm số lượng DOM elements cần render.
- **Viewport-based rendering:** Chỉ render marker của các xe nằm trong vùng nhìn hiện tại của bản đồ.
- **Debounced updates:** Gom nhóm các cập nhật vị trí trong khoảng 100ms để tránh re-render quá nhiều lần.

##### c) Các thành phần bản đồ

Hệ thống bao gồm bốn component bản đồ chuyên biệt:

| Component   | File                              | Chức năng                                                                  |
| ----------- | --------------------------------- | -------------------------------------------------------------------------- |
| VehicleMap  | `components/map/vehicle-map.tsx`  | Hiển thị tất cả xe trên bản đồ với marker và popup thông tin               |
| RouteMap    | `components/map/route-map.tsx`    | Hiển thị tuyến đường chuyến đi với polyline và các điểm dừng               |
| GeofenceMap | `components/map/geofence-map.tsx` | Vẽ và chỉnh sửa vùng địa lý (polygon, circle, rectangle)                   |
| MarkerPopup | `components/map/marker-popup.tsx` | Popup hiển thị thông tin xe khi click marker (biển số, tốc độ, trạng thái) |

![Hình 3.20 - Giao diện trang bản đồ thời gian thực với các marker xe](./assets/figures/06-chuong-3-giai-phap-frontend-hinh-3–20.png)

*Hình 3.20: Giao diện trang bản đồ thời gian thực với các marker xe*

> Nguồn: Giao diện ứng dụng IVM26 (hình chụp màn hình)

#### 3.2.4.5. Thiết kế responsive và trải nghiệm người dùng (Responsive Design & UX)

##### a) Chiến lược responsive

Hệ thống áp dụng chiến lược Mobile-First với ba mức breakpoint chính:

[Bảng 3.28: Breakpoint và tương ứng giao diện]

| Breakpoint | Kích thước     | Giao diện                   | Điều chỉnh chính                                                      |
| ---------- | -------------- | --------------------------- | --------------------------------------------------------------------- |
| Mobile     | < 640px        | Giao diện tối giản, một cột | Sidebar thành drawer, bảng thành danh sách card, bản đồ toàn màn hình |
| Tablet     | 640px - 1024px | Giao diện trung gian        | Sidebar thu gọn (icon-only), bảng giữ nguyên với cuộn ngang           |
| Desktop    | > 1024px       | Giao diện đầy đủ            | Sidebar mở rộng, bảng đầy đủ cột, bản đồ chia đôi màn hình            |

##### b) Layout chính

Giao diện Dashboard sử dụng bố cục (layout) gồm ba vùng chính: Header (breadcrumbs, search, user menu, theme toggle), Sidebar (navigation menu), và Main Content Area (page content, filters, data tables).

![Hình 3.21 - Wireframe bố cục giao diện Dashboard](./assets/figures/06-chuong-3-giai-phap-frontend-hinh-3–21.png)

*Hình 3.21: Wireframe bố cục giao diện Dashboard*

> Nguồn: Hình vẽ của tác giả

##### c) Hệ thống theme Light/Dark

Hệ thống hỗ trợ hai chế độ giao diện (Light và Dark) sử dụng CSS Variables với hệ màu oklch. Chuyển đổi được thực hiện qua thư viện `next-themes` và lưu trong cookie.

##### d) Các mẫu thiết kế giao diện (UI Patterns)

Hệ thống áp dụng các mẫu thiết kế giao diện nhất quán xuyên suốt ứng dụng:

- **Bảng dữ liệu (Data Tables):** Sắp xếp, lọc, phân trang phía server, chọn nhiều dòng, xuất dữ liệu CSV/Excel.
- **Biểu mẫu (Forms):** React Hook Form + Zod validation, inline error messages, toast notifications (Sonner).
- **Bản đồ (Maps):** Custom markers với màu theo trạng thái, popup thông tin, drawing tools cho geofence.
- **Biểu đồ (Charts):** ECharts/Recharts cho telemetry, line chart tốc độ, gauge chart RPM, area chart nhiên liệu/nhiệt độ.

![Hình 3.22 - Các mẫu thiết kế UI của hệ thống - Data Table, Form, Charts](./assets/figures/06-chuong-3-giai-phap-frontend-hinh-3–22.png)

*Hình 3.22: Các mẫu thiết kế UI của hệ thống - Data Table, Form, Charts*

> Nguồn: Giao diện ứng dụng IVM26 (hình chụp màn hình)

##### e) Tối ưu trải nghiệm người dùng

Để nâng cao trải nghiệm người dùng, hệ thống áp dụng một số kỹ thuật:

- **Optimistic Updates:** Giao diện cập nhật ngay lập tức trước khi nhận phản hồi từ server.
- **Skeleton Loading:** Hiển thị khung xương thay vì spinner khi đang tải dữ liệu.
- **Page Transition Loader:** Thanh tiến trình ở đầu trang (sử dụng `nextjs-toploader`) khi chuyển trang.
- **Keyboard Shortcuts:** Hỗ trợ phím tắt cho các thao tác phổ biến (`Cmd+K` cho tìm kiếm).
- **Error Boundaries:** Mỗi khu vực chức năng được bao bọc bởi Error Boundary riêng.
- **Empty States:** Hiển thị trạng thái trống có hướng dẫn hành động khi chưa có dữ liệu.

---

## 3.3. Phân tích, đánh giá và lựa chọn phương án khả thi – Analysis, Evaluation and Selection

Dựa trên phân tích các giải pháp đề xuất cho từng tầng hệ thống ở mục 3.2, bảng tổng hợp dưới đây đánh giá và so sánh các phương án đã xem xét:

[Bảng 3.29: Ma trận đánh giá tổng hợp các phương án thiết kế]

| Tầng hệ thống        | Phương án được chọn     | Lý do chính                              |
| -------------------- | ----------------------- | ---------------------------------------- |
| Vi điều khiển        | ESP32-S3                | BLE 5.0 tích hợp, dual-core, hỗ trợ AI   |
| LTE + GNSS           | SIMCom A7670C + u-blox NEO-M8N | Kiến trúc tách rời, dễ mở rộng, ổn định |
| OBD2 Adapter         | vgate iCar Pro (BLE)    | Không cần dây, tương thích rộng          |
| Cảm biến IMU         | LIS3DH                  | Siêu tiết kiệm điện, wake-on-motion      |
| MQTT Broker          | EMQX                    | Rules Engine, ACL per device, clustering |
| Database quan hệ     | PostgreSQL 16           | Mature, PostGIS, open-source             |
| Database time-series | VictoriaMetrics         | Write throughput cao, PromQL compatible  |
| API Server           | Express.js + TypeScript | Nhẹ, linh hoạt, DDD architecture         |
| Frontend             | Next.js 15 + React 19   | SSR/SSG, App Router, ecosystem           |
| Bản đồ               | Leaflet.js              | Open-source, self-hosted tiles           |

## 3.4. Tối ưu phương án thiết kế – The optimal solution

Từ kết quả phân tích và đánh giá ở mục 3.3, phương án thiết kế tối ưu cho hệ thống IoT giám sát phương tiện được tổng hợp như sau:

![Hình 3.23 - Sơ đồ kiến trúc tổng thể phương án tối ưu](./assets/figures/06-chuong-3-giai-phap-frontend-hinh-3–23.png)

*Hình 3.23: Sơ đồ kiến trúc tổng thể phương án tối ưu*

> Nguồn: Hình vẽ của tác giả

**Kiến trúc phân tầng:**

- **Tầng thiết bị (Device Layer):** ESP32-S3 + A7670C + NEO-M8N + vgate iCar Pro + LIS3DH, quản lý nguồn thông minh với pin dự phòng 21700
- **Tầng truyền thông (Communication Layer):** MQTT 5.0 qua 4G LTE, QoS 1, offline buffering
- **Tầng xử lý (Processing Layer):** MQTT Bridge --> dual-write PostgreSQL + VictoriaMetrics, Express.js API (DDD)
- **Tầng trình bày (Presentation Layer):** Next.js 15, Leaflet maps, Socket.IO real-time, ECharts

Phương án này đáp ứng các yêu cầu kỹ thuật đã đặt ra ở Chương 2, với chi phí phần cứng ước tính 870.000 — 1.630.000 VNĐ/thiết bị.

---

## Kết luận chương 3

Chương này đã trình bày có hệ thống quá trình phân tích, đề xuất và lựa chọn phương án thiết kế cho toàn bộ hệ thống IoT giám sát phương tiện trên bốn tầng: phần cứng, firmware, backend/cloud và frontend. Thông qua ma trận đánh giá trọng số ở từng tầng, phương án tối ưu được xác lập theo các tiêu chí hiệu năng, chi phí và khả năng mở rộng. Kết quả lựa chọn tạo cơ sở kỹ thuật nhất quán cho giai đoạn triển khai chi tiết tại Chương 4.

