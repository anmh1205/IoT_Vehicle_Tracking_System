'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, formatNumber } from '@/lib/utils/date/format';

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
  maintenance: 'Đang bảo trì',
  retired: 'Ngưng khai thác',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  maintenance: 'outline',
  retired: 'destructive',
};

const Item = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium">{value}</p>
  </div>
);

const fmt = (value: unknown, fallback = '--') => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text.length > 0 ? text : fallback;
};

const fmtKm = (value: unknown) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 'Chưa cập nhật';
  return `${formatNumber(num)} km`;
};

export const VehicleDetailContent = ({ vehicle }: { vehicle: any | null }) => {
  if (!vehicle) return null;

  const status = STATUS_LABELS[vehicle.status] ?? fmt(vehicle.status, 'Chưa xác định');
  const title = fmt(vehicle.plateNumber, fmt(vehicle.vehicleId, 'Chi tiết phương tiện'));
  const subtitle = [fmt(vehicle.vehicleId, ''), fmt(vehicle.brand, ''), fmt(vehicle.model, '')]
    .filter((part) => part.length > 0)
    .join(' • ');
  const hasDevice = Boolean(vehicle.deviceId);
  const hasCustomer = Boolean(vehicle.customerId);

  return (
    <div className="space-y-4">
      <Card className="border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANTS[vehicle.status] ?? 'secondary'}>{status}</Badge>
            <Badge variant={hasDevice ? 'secondary' : 'outline'}>
              {hasDevice ? 'Đã gán telemetry' : 'Chưa gán telemetry'}
            </Badge>
            <Badge variant={hasCustomer ? 'secondary' : 'outline'}>
              {hasCustomer ? 'Đã gán chủ sở hữu' : 'Chưa gán chủ sở hữu'}
            </Badge>
          </div>

          <div>
            <p className="text-2xl font-semibold tracking-tight">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {subtitle || 'Chưa đủ thông tin nhận diện phương tiện.'}
            </p>
          </div>

          {!hasDevice || !hasCustomer ? (
            <div className="rounded-xl border border-dashed px-3 py-2 text-sm text-muted-foreground">
              {!hasDevice ? 'Cần gán thiết bị để có telemetry theo thời gian thực.' : null}
              {!hasDevice && !hasCustomer ? ' • ' : null}
              {!hasCustomer ? 'Cần gán khách hàng để quản lý sở hữu và báo cáo.' : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nhận diện phương tiện</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Item label="Mã xe" value={fmt(vehicle.vehicleId)} />
            <Item label="Biển số" value={fmt(vehicle.plateNumber)} />
            <Item label="Hãng xe" value={fmt(vehicle.brand, 'Chưa cập nhật')} />
            <Item label="Dòng xe" value={fmt(vehicle.model, 'Chưa cập nhật')} />
            <Item label="Năm sản xuất" value={fmt(vehicle.year, 'Chưa cập nhật')} />
            <Item label="Loại xe" value={fmt(vehicle.vehicleType, 'Chưa phân loại')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liên kết hệ thống</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Item label="Thiết bị gắn" value={fmt(vehicle.deviceId, 'Chưa gán')} />
            <Item label="Khách hàng" value={fmt(vehicle.customerId, 'Chưa gán')} />
            <Item label="Firmware" value={fmt(vehicle.firmwareVersion, 'Chưa có dữ liệu')} />
            <Item label="Map icon" value={fmt(vehicle.iconType, 'Chưa cấu hình')} />
            <Item label="Tạo lúc" value={formatDateTime(vehicle.createdAt)} />
            <Item label="Cập nhật" value={formatDateTime(vehicle.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vận hành và khai thác</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Item label="Odometer" value={fmtKm(vehicle.mileageKm)} />
            <Item label="Số ghế" value={fmt(vehicle.seats, 'Chưa cập nhật')} />
            <Item label="Nhiên liệu" value={fmt(vehicle.fuelType, 'Chưa xác định')} />
            <Item label="Số đăng kiểm" value={fmt(vehicle.registrationNumber, 'Chưa cập nhật')} />
            <Item label="Hạn bảo hiểm" value={formatDateTime(vehicle.insuranceExpiry, 'dd/MM/yyyy')} />
            <Item label="Ghi chú" value={fmt(vehicle.notes, 'Chưa có ghi chú')} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
