# Requirements Document

## Introduction

Tính năng Trip Cost Estimation cho phép hệ thống IoT Vehicle Tracking ước tính và tính toán chi phí cho thuê xe dựa trên mô hình đơn giản: chi phí thuê theo ngày và phí phạt trả xe muộn theo giờ. Chi phí theo km được tính và hiển thị để tham khảo nhưng KHÔNG tính vào tổng chi phí. Flow bắt đầu khi operator gắn khách hàng với xe và kích hoạt cho thuê (rental activation), kết thúc khi xe được trả. Hệ thống tích hợp với dữ liệu GPS telemetry hiện có để tính km thực tế. Module này KHÔNG tính chi phí tài xế (drivers vẫn tồn tại trong hệ thống nhưng không liên quan đến cost calculation).

## Glossary

- **Cost_Calculator**: Module backend tính toán chi phí cho thuê xe dựa trên rental duration và late return hours. Distance cost chỉ để tham khảo, không tính vào tổng.
- **Rental_Activation**: Hành động kích hoạt cho thuê xe, đánh dấu thời điểm bắt đầu tính thời gian thuê (actual_start)
- **Rental_Rate_Config**: Bảng cấu hình đơn giá cho thuê bao gồm cost_per_km (tham khảo), daily_rental_rate, và late_penalty_per_hour
- **Trip_Cost**: Bản ghi chi phí liên kết với một chuyến đi, bao gồm distance_cost (tham khảo), rental_cost, late_penalty, và total_cost
- **Distance_Cost**: Chi phí ước tính theo km = total_distance_km × cost_per_km (CHỈ ĐỂ THAM KHẢO, không tính vào total_cost)
- **Rental_Cost**: Chi phí thuê theo ngày = rental_days × daily_rental_rate (làm tròn lên nếu không đủ ngày)
- **Late_Penalty**: Phí phạt trả xe muộn = late_hours × late_penalty_per_hour
- **Planned_Return_Time**: Thời điểm trả xe theo kế hoạch (planned_end trong bảng trips)
- **Actual_Return_Time**: Thời điểm trả xe thực tế (actual_end trong bảng trips)
- **Late_Hours**: Số giờ trả xe muộn = max(0, Actual_Return_Time - Planned_Return_Time) tính theo giờ, làm tròn lên
- **Rental_Days**: Số ngày thuê = ceil((Actual_Return_Time - Rental_Activation_Time) / 24 hours)
- **Cost_Report_Generator**: Module tạo báo cáo chi phí theo khách hàng, theo xe, theo khoảng thời gian
- **Vehicle_Rate_Group**: Nhóm xe chia sẻ cùng cấu hình đơn giá (ví dụ: sedan, SUV, truck)

## Requirements

### Requirement 1: Cấu hình đơn giá cho thuê

**User Story:** As an operator, I want to configure rental rates for each vehicle or vehicle group, so that the system can calculate trip costs based on the correct pricing.

#### Acceptance Criteria

1. THE Rental_Rate_Config SHALL store cost_per_km (VND/km), daily_rental_rate (VND/day), and late_penalty_per_hour (VND/hour) for each vehicle or Vehicle_Rate_Group
2. WHEN no vehicle-specific rate exists, THE Rental_Rate_Config SHALL fall back to the Vehicle_Rate_Group rate based on vehicle_type
3. WHEN an operator updates a rate configuration, THE Rental_Rate_Config SHALL record the effective_date and preserve previous rate values for historical cost calculations
4. THE Rental_Rate_Config SHALL validate that cost_per_km, daily_rental_rate, and late_penalty_per_hour are positive numeric values greater than zero
5. THE Rental_Rate_Config SHALL allow operators to assign a vehicle to a Vehicle_Rate_Group

### Requirement 2: Kích hoạt cho thuê (Rental Activation)

**User Story:** As an operator, I want to activate a rental when assigning a customer to a vehicle, so that the system starts tracking rental duration from the activation moment.

#### Acceptance Criteria

1. WHEN an operator assigns a customer to a vehicle AND triggers Rental_Activation, THE System SHALL record the activation timestamp as actual_start in the trip record
2. WHEN Rental_Activation is triggered, THE System SHALL verify that the vehicle has an active GPS device attached and is in "active" status
3. WHEN Rental_Activation is triggered, THE System SHALL set the trip status to "in_progress"
4. IF the vehicle is already in an active rental (trip status "in_progress"), THEN THE System SHALL reject the Rental_Activation and return an error message
5. WHEN Rental_Activation is triggered, THE System SHALL record the planned_end time based on the agreed rental duration provided by the operator
6. THE System SHALL require both a valid customer_id and vehicle_id before allowing Rental_Activation

### Requirement 3: Tính chi phí km tham khảo (Distance Cost — Reference Only)

**User Story:** As an operator, I want the system to calculate and display distance-based cost using actual GPS data as a reference metric, so that I can see how much the trip would cost per km without it affecting the actual bill.

#### Acceptance Criteria

1. WHEN a trip transitions to status "completed", THE Cost_Calculator SHALL calculate Distance_Cost as total_distance_km multiplied by cost_per_km from the applicable Rental_Rate_Config
2. THE Cost_Calculator SHALL use the distance_km value from the trip record, which is derived from GPS telemetry data
3. THE Distance_Cost SHALL be stored in the Trip_Cost record as a reference value but SHALL NOT be included in the total_cost calculation
4. THE UI SHALL display Distance_Cost with a clear label indicating it is "Tham khảo" (reference only) and visually distinguish it from billable costs

### Requirement 4: Tính chi phí thuê theo ngày (Rental Cost)

**User Story:** As an operator, I want the system to calculate daily rental cost based on actual rental duration, so that customers are charged for the number of days they used the vehicle.

#### Acceptance Criteria

1. WHEN a trip transitions to status "completed", THE Cost_Calculator SHALL calculate Rental_Days as the ceiling of (Actual_Return_Time minus Rental_Activation_Time) divided by 24 hours
2. THE Cost_Calculator SHALL calculate Rental_Cost as Rental_Days multiplied by daily_rental_rate from the applicable Rental_Rate_Config
3. IF Rental_Days is less than 1, THEN THE Cost_Calculator SHALL treat Rental_Days as 1 (minimum one day charge)
4. THE Cost_Calculator SHALL use the Rental_Rate_Config that was effective at the Rental_Activation timestamp for daily_rental_rate calculation

### Requirement 5: Tính phí phạt trả xe muộn (Late Penalty)

**User Story:** As an operator, I want the system to calculate late return penalties, so that customers who return vehicles after the agreed time are charged appropriately.

#### Acceptance Criteria

1. WHEN a trip transitions to status "completed" AND Actual_Return_Time exceeds Planned_Return_Time, THE Cost_Calculator SHALL calculate Late_Hours as the ceiling of (Actual_Return_Time minus Planned_Return_Time) in hours
2. THE Cost_Calculator SHALL calculate Late_Penalty as Late_Hours multiplied by late_penalty_per_hour from the applicable Rental_Rate_Config
3. IF Actual_Return_Time is equal to or earlier than Planned_Return_Time, THEN THE Cost_Calculator SHALL set Late_Penalty to zero
4. THE Cost_Calculator SHALL use the Rental_Rate_Config that was effective at the Rental_Activation timestamp for late_penalty_per_hour calculation

### Requirement 6: Tổng hợp chi phí chuyến đi (Total Trip Cost)

**User Story:** As an operator, I want the system to calculate and store the total trip cost with a full breakdown, so that I can review all cost components for each rental.

#### Acceptance Criteria

1. WHEN a trip transitions to status "completed", THE Cost_Calculator SHALL calculate total_cost as the sum of Rental_Cost and Late_Penalty ONLY (Distance_Cost is excluded from total)
2. THE Cost_Calculator SHALL store the Trip_Cost record with individual values for distance_cost (reference), rental_cost, late_penalty, total_cost, distance_km, rental_days, and late_hours
3. THE Cost_Calculator SHALL link the Trip_Cost record to the trip_id, vehicle_id, and customer_id
4. WHEN any input value (distance_km, actual_start, actual_end, planned_end) is updated on a completed trip, THE Cost_Calculator SHALL recalculate the Trip_Cost automatically
5. THE Cost_Calculator SHALL store the rate snapshot (cost_per_km, daily_rental_rate, late_penalty_per_hour used) in the Trip_Cost record for audit purposes
6. THE UI SHALL clearly show total_cost = Rental_Cost + Late_Penalty, with Distance_Cost displayed separately as "Chi phí km (tham khảo)"

### Requirement 7: Lịch sử cho thuê

**User Story:** As an operator, I want to view the rental history with cost details, so that I can track all past rentals and their associated costs.

#### Acceptance Criteria

1. THE System SHALL display a list of all completed rentals with trip_code, vehicle plate_number, customer name, rental period, total_distance_km, and total_cost
2. THE System SHALL support filtering rental history by customer, vehicle, date range, and cost range
3. THE System SHALL support sorting rental history by any displayed column
4. WHEN an operator selects a rental record, THE System SHALL display the full cost breakdown (Distance_Cost, Rental_Cost, Late_Penalty) and the rate snapshot used for calculation

### Requirement 8: Báo cáo chi phí

**User Story:** As a manager, I want to view cost reports aggregated by customer, vehicle, and time period, so that I can analyze revenue and identify trends.

#### Acceptance Criteria

1. THE Cost_Report_Generator SHALL aggregate Trip_Cost data by vehicle over a specified date range, showing total revenue, total trips, total distance, and average cost per trip
2. THE Cost_Report_Generator SHALL aggregate Trip_Cost data by customer over a specified date range, showing total spending, total trips, total rental days, and average cost per rental
3. THE Cost_Report_Generator SHALL support date range filtering with date_from and date_to parameters
4. THE Cost_Report_Generator SHALL support grouping results by day, week, or month intervals
5. THE Cost_Report_Generator SHALL include breakdown totals for each cost component (total distance_cost, total rental_cost, total late_penalty) in aggregated reports

### Requirement 9: API endpoints cho Trip Cost

**User Story:** As a frontend developer, I want REST API endpoints for trip cost management, so that I can build the rental cost UI.

#### Acceptance Criteria

1. THE System SHALL expose a POST endpoint to trigger Rental_Activation with vehicle_id, customer_id, and planned_end as required parameters
2. THE System SHALL expose a POST endpoint to complete a rental (return vehicle) that triggers cost calculation
3. THE System SHALL expose a GET endpoint that returns the Trip_Cost breakdown for a specific trip by trip_id
4. THE System SHALL expose a GET endpoint for rental history with pagination, filtering, and sorting parameters
5. THE System SHALL expose a GET endpoint for cost reports with groupBy, date_from, date_to, and interval parameters
6. THE System SHALL expose GET and PUT endpoints for managing Rental_Rate_Config
7. WHEN an unauthorized user attempts to access cost endpoints, THE System SHALL return a 403 Forbidden response

