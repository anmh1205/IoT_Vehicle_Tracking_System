## IX.3.20 Soft Delete Support

**Các bảng quan trọng nên có soft delete:**

- `vehicles`: Thêm `deleted_at TIMESTAMP NULL`
- `customers`: Thêm `deleted_at TIMESTAMP NULL`
- `bookings`: Thêm `deleted_at TIMESTAMP NULL`
- `devices`: Thêm `deleted_at TIMESTAMP NULL`
- `users`: Thêm `deleted_at TIMESTAMP NULL`

**Ví dụ cho vehicles:**

```sql
ALTER TABLE vehicles ADD COLUMN deleted_at TIMESTAMP NULL;
CREATE INDEX idx_vehicles_deleted_at ON vehicles(deleted_at) WHERE deleted_at IS NULL;
```

**Lợi Ích Soft Delete:**

- ✅ **Khôi Phục Dữ Liệu**: Có thể khôi phục dữ liệu đã xóa nhầm
- ✅ **Lịch Sử**: Giữ lại lịch sử dữ liệu đã xóa
- ✅ **Tuân Thủ**: Đáp ứng yêu cầu pháp lý về lưu trữ dữ liệu
- ✅ **Phân Tích**: Có thể phân tích dữ liệu đã xóa

**Cách Sử Dụng:**

- Khi xóa: SET `deleted_at = NOW()` thay vì DELETE
- Khi query: WHERE `deleted_at IS NULL` để chỉ lấy dữ liệu chưa xóa
- Khi khôi phục: SET `deleted_at = NULL`

