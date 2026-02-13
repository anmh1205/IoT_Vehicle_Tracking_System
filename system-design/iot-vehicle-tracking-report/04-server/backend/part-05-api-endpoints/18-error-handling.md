## PHẦN XI.18: ERROR HANDLING

### XI.18 Error Handling

**Standard Error Response Format:**

Tất cả các lỗi API đều tuân theo cấu trúc thống nhất sau:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message description",
    "status": 400,
    "path": "/api/v1/endpoint",
    "details": null,
    "traceId": null
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Error Response với Validation Details:**

Khi có lỗi validation, `details` sẽ chứa thông tin chi tiết:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "status": 400,
    "path": "/api/v1/vehicles",
    "details": [
      {
        "field": "plate_number",
        "message": "Plate number is required",
        "value": null
      },
      {
        "field": "email",
        "message": "Email must be a valid email",
        "value": "invalid-email"
      }
    ],
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**TraceId (Request Tracking ID):**

`traceId` là một **unique identifier** được gán cho mỗi request để theo dõi và debug lỗi trong hệ thống.

**Mục đích:**

- **Tracking**: Theo dõi một request từ đầu đến cuối qua các service/microservice
- **Debugging**: Tìm kiếm logs liên quan đến một lỗi cụ thể
- **Support**: Người dùng có thể cung cấp traceId khi báo lỗi, giúp dev tìm nhanh nguyên nhân
- **Distributed Tracing**: Trong kiến trúc microservices, traceId giúp theo dõi request qua nhiều service

**Format:**

- Thường sử dụng **UUID v4** (ví dụ: `550e8400-e29b-41d4-a716-446655440000`)
- Hoặc **correlation ID** (ví dụ: `req-20240115-abc123def456`)
- Phải là **unique** và **immutable** trong suốt lifecycle của request

**Cách sử dụng:**

1. **Client gửi request** → Server tạo traceId mới (hoặc sử dụng traceId từ header nếu có)
2. **Server xử lý** → Ghi tất cả logs với traceId này
3. **Lỗi xảy ra** → Trả về traceId trong error response
4. **Client nhận error** → Lưu traceId để báo cáo
5. **Dev debug** → Tìm kiếm logs bằng traceId

**Ví dụ Implementation (NestJS):**

```typescript
// Interceptor để tạo traceId cho mỗi request
@Injectable()
export class TraceIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Tạo traceId mới hoặc sử dụng từ header
    const traceId = request.headers["x-trace-id"] || uuidv4();

    // Gán vào request để sử dụng trong toàn bộ request lifecycle
    request.traceId = traceId;

    return next.handle().pipe(
      tap(() => {
        // Log với traceId
        this.logger.log(`Request completed`, { traceId });
      }),
      catchError((error) => {
        // Log error với traceId
        this.logger.error(`Request failed`, { traceId, error });
        throw error;
      })
    );
  }
}

// Exception Filter để thêm traceId vào error response
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const request = host.switchToHttp().getRequest();
    const traceId = request.traceId || null;

    // Thêm traceId vào error response
    const errorResponse = {
      error: {
        ...errorDetails,
        traceId: traceId,
      },
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
```

**Client sử dụng traceId:**

```typescript
// Frontend: Lưu traceId khi có lỗi
try {
  const response = await api.createVehicle(data);
} catch (error) {
  const traceId = error.response.data.error.traceId;

  // Hiển thị cho user
  toast.error(`Error: ${error.message}. TraceId: ${traceId}`);

  // Hoặc gửi traceId lên error tracking service (Sentry, etc.)
  Sentry.captureException(error, { tags: { traceId } });
}
```

**Tìm kiếm logs bằng traceId:**

```bash
# Tìm tất cả logs liên quan đến một traceId
grep "550e8400-e29b-41d4-a716-446655440000" /var/log/api-server.log

# Hoặc trong log aggregation tool (ELK, Datadog, etc.)
traceId:"550e8400-e29b-41d4-a716-446655440000"
```

**Lưu ý:**

- `traceId` có thể là `null` nếu không được tạo (ví dụ: lỗi xảy ra trước khi interceptor chạy)
- Trong production, nên **luôn tạo traceId** cho mọi request
- TraceId nên được **propagate** qua các service calls (HTTP headers, MQTT metadata, etc.)

**Error Codes:**

- `VALIDATION_ERROR`: Lỗi validation (400)
- `UNAUTHORIZED`: Chưa xác thực (401)
- `FORBIDDEN`: Không có quyền (403)
- `NOT_FOUND`: Không tìm thấy resource (404)
- `CONFLICT`: Xung đột dữ liệu (409)
- `INTERNAL_SERVER_ERROR`: Lỗi server (500)
- `BAD_REQUEST`: Request không hợp lệ (400)
- `TOO_MANY_REQUESTS`: Quá nhiều requests (429)

**HTTP Status Codes:**

- `200 OK`: Success
- `201 Created`: Resource created successfully
- `400 Bad Request`: Validation error, invalid input
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

**Ví dụ Error Responses:**

**404 Not Found:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Vehicle with ID 123 not found",
    "status": 404,
    "path": "/api/v1/vehicles/123",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**401 Unauthorized:**

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token",
    "status": 401,
    "path": "/api/v1/vehicles",
    "details": null,
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**409 Conflict:**

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Vehicle with plate number '30A-12345' already exists",
    "status": 409,
    "path": "/api/v1/vehicles",
    "details": {
      "field": "plate_number",
      "existing_id": 5
    },
    "traceId": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---
