'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDateTime, formatNumber } from '@/lib/utils/date/format';

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
  maintenance: 'Đang bảo trì',
  retired: 'Ngưng khai thác',
};

const VEHICLE_STATUS_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  inactive: 'secondary',
  maintenance: 'outline',
  retired: 'destructive',
};

const formatValue = (value: string | number | null | undefined, fallback = 'Chưa cập nhật') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const next = String(value).trim();
  return next.length > 0 ? next : fallback;
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium leading-6">{value}</p>
  </div>
);

const formatMileage = (value: number | null | undefined) =>
  value === null || value === undefined ? 'Chưa cập nhật' : `${formatNumber(value)} km`;

const getInsuranceBadge = (value: string | null | undefined) => {
  if (!value) {
    return { label: 'Chưa có hạn bảo hiểm', variant: 'outline' as const };
  }

  const expiry = new Date(value);
  if (Number.isNaN(expiry.getTime())) {
    return { label: 'Ngày bảo hiểm không hợp lệ', variant: 'destructive' as const };
  }

  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) {
    return { label: 'Bảo hiểm đã hết hạn', variant: 'destructive' as const };
  }
  if (daysLeft <= 30) {
    return { label: `Sắp hết hạn trong ${daysLeft} ngày`, variant: 'outline' as const };
  }

  return { label: 'Bảo hiểm còn hiệu lực', variant: 'secondary' as const };
};

const getCustomerLabel = (vehicle: any) => {
  const parts = [vehicle?.customerName, vehicle?.customerCode].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' • ');
  }

  return vehicle?.customerId ? `Khách hàng #${vehicle.customerId}` : 'Chưa gán';
};

export const VehicleDetailContent = ({
  vehicle,
  compact = false,
}: {
  vehicle: any | null;
  compact?: boolean;
}) => {
  if (!vehicle) {
    return null;
  }

  const insuranceBadge = getInsuranceBadge(vehicle.insuranceExpiry);
  const headline = formatValue(
    vehicle.plateNumber ?? vehicle.vehicleId,
    'Phương tiện chưa có biển số',
  );
  const subheadline = [vehicle.vehicleId, vehicle.vehicleType, [vehicle.brand, vehicle.model].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(' • ');
  const customerLabel = getCustomerLabel(vehicle);
  const statusLabel =
    VEHICLE_STATUS_LABELS[vehicle.status] ?? formatValue(vehicle.status, 'Chưa xác định');
  const missingAssignments = [
    !vehicle.deviceId ? 'Chưa gắn thiết bị telemetry' : null,
    !vehicle.customerId ? 'Chưa gắn khách hàng sở hữu' : null,
  ].filter(Boolean);

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className={cn('space-y-4', compact ? 'p-4' : 'p-6')}>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.95fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant={VEHICLE_STATUS_VARIANTS[vehicle.status] ?? 'secondary'}>
                  {statusLabel}
                </Badge>
                <Badge variant={vehicle.deviceId ? 'secondary' : 'outline'}>
                  {vehicle.deviceId ? 'Telemetry đã gắn' : 'Thiếu thiết bị telemetry'}
                </Badge>
                <Badge variant={insuranceBadge.variant}>{insuranceBadge.label}</Badge>
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">{headline}</h2>
                <p className="text-sm text-muted-foreground">
                  {subheadline || 'Chưa đủ thông tin nhận diện cho phương tiện này.'}
                </p>
              </div>

              <div className="rounded-2xl border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                Theo dõi tình trạng khai thác, pháp lý và liên kết telemetry của xe tại một chỗ để
                đối chiếu nhanh trước khi xử lý cảnh báo hoặc bảo trì.
              </div>

              {missingAssignments.length > 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  {missingAssignments.join(' • ')}. Các màn hình hành trình, ownership và cảnh báo sẽ
                  thiếu ngữ cảnh nếu liên kết chưa hoàn chỉnh.
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow label="Thiết bị gắn" value={formatValue(vehicle.deviceId, 'Chưa gắn')} />
              <InfoRow label="Khách hàng" value={customerLabel} />
              <InfoRow label="Odometer" value={formatMileage(vehicle.mileageKm)} />
              <InfoRow
                label="Số ghế"
                value={vehicle.seats ? String(vehicle.seats) : 'Chưa cập nhật'}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nhận diện phương tiện</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <InfoRow label="Mã xe" value={formatValue(vehicle.vehicleId, 'Chưa có')} />
            <InfoRow label="Biển số" value={formatValue(vehicle.plateNumber, 'Chưa có')} />
            <InfoRow label="Hãng xe" value={formatValue(vehicle.brand)} />
            <InfoRow label="Dòng xe" value={formatValue(vehicle.model)} />
            <InfoRow
              label="Năm sản xuất"
              value={vehicle.year ? String(vehicle.year) : 'Chưa cập nhật'}
            />
            <InfoRow label="Màu sơn" value={formatValue(vehicle.color)} />
            <InfoRow label="VIN" value={formatValue(vehicle.vin)} />
            <InfoRow label="Loại xe" value={formatValue(vehicle.vehicleType, 'Chưa phân loại')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liên kết hệ thống</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <InfoRow label="Thiết bị telemetry" value={formatValue(vehicle.deviceId, 'Chưa gắn')} />
            <InfoRow label="Khách hàng sở hữu" value={customerLabel} />
            <InfoRow label="Trạng thái" value={statusLabel} />
            <InfoRow label="Biểu tượng bản đồ" value={formatValue(vehicle.iconType, 'Mặc định')} />
            <InfoRow label="Tạo lúc" value={formatDateTime(vehicle.createdAt)} />
            <InfoRow label="Cập nhật gần nhất" value={formatDateTime(vehicle.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Khai thác và cấu hình</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <InfoRow label="Nhiên liệu" value={formatValue(vehicle.fuelType, 'Chưa xác định')} />
            <InfoRow label="Hộp số" value={formatValue(vehicle.transmission, 'Chưa xác định')} />
            <InfoRow
              label="Số ghế"
              value={vehicle.seats ? String(vehicle.seats) : 'Chưa cập nhật'}
            />
            <InfoRow label="Odometer" value={formatMileage(vehicle.mileageKm)} />
            <InfoRow label="Màu nhận diện" value={formatValue(vehicle.colorHex, 'Chưa cấu hình')} />
            <InfoRow label="Ghi chú vận hành" value={formatValue(vehicle.notes, 'Chưa có ghi chú')} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pháp lý và hồ sơ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <InfoRow
              label="Số đăng kiểm"
              value={formatValue(vehicle.registrationNumber, 'Chưa cập nhật')}
            />
            <InfoRow
              label="Hạn bảo hiểm"
              value={formatDateTime(vehicle.insuranceExpiry, 'dd/MM/yyyy')}
            />
            <InfoRow label="Trạng thái bảo hiểm" value={insuranceBadge.label} />
            <InfoRow label="ID nội bộ" value={vehicle.id ? String(vehicle.id) : 'Chưa có'} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
