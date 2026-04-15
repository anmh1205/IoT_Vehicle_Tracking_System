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

const InfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="space-y-1 rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="text-sm font-medium">{value}</p>
  </div>
);

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

const formatMileage = (value: number | null | undefined) =>
  value === null || value === undefined ? 'Chưa cập nhật' : `${formatNumber(value)} km`;

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
  const headline = vehicle.plateNumber ?? vehicle.vehicleId ?? 'Phương tiện chưa có biển số';
  const subheadline = [
    vehicle.vehicleId,
    vehicle.vehicleType,
    [vehicle.brand, vehicle.model].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join(' • ');
  const missingAssignments = [
    !vehicle.deviceId ? 'Chưa gắn thiết bị telemetry' : null,
    !vehicle.customerId ? 'Chưa gán khách hàng sở hữu' : null,
  ].filter(Boolean);

  return (
    <div className={cn('space-y-4', compact && 'pr-1')}>
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className={cn('space-y-4', compact ? 'p-4' : 'p-6')}>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={VEHICLE_STATUS_VARIANTS[vehicle.status] ?? 'secondary'}>
                  {VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status ?? 'Chưa xác định'}
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
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:w-[24rem]">
              <InfoRow label="Thiết bị gắn" value={vehicle.deviceId ?? 'Chưa gắn'} />
              <InfoRow
                label="Khách hàng"
                value={vehicle.customerId ? String(vehicle.customerId) : 'Chưa gán'}
              />
              <InfoRow label="Odometer" value={formatMileage(vehicle.mileageKm)} />
              <InfoRow label="Số ghế" value={vehicle.seats ? String(vehicle.seats) : 'Chưa cập nhật'} />
            </div>
          </div>

          {missingAssignments.length > 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
              {missingAssignments.join(' • ')}. Các phần theo dõi hành trình, sở hữu và firmware sẽ thiếu
              ngữ cảnh nếu không hoàn thiện các liên kết này.
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
            <InfoRow label="Mã xe" value={vehicle.vehicleId ?? 'Chưa có'} />
            <InfoRow label="Biển số" value={vehicle.plateNumber ?? 'Chưa có'} />
            <InfoRow label="Hãng xe" value={vehicle.brand ?? 'Chưa cập nhật'} />
            <InfoRow label="Dòng xe" value={vehicle.model ?? 'Chưa cập nhật'} />
            <InfoRow label="Năm sản xuất" value={vehicle.year ? String(vehicle.year) : 'Chưa cập nhật'} />
            <InfoRow label="Màu sơn" value={vehicle.color ?? 'Chưa cập nhật'} />
            <InfoRow label="VIN" value={vehicle.vin ?? 'Chưa cập nhật'} />
            <InfoRow label="Loại xe" value={vehicle.vehicleType ?? 'Chưa phân loại'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Liên kết hệ thống</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Thiết bị telemetry" value={vehicle.deviceId ?? 'Chưa gắn'} />
            <InfoRow
              label="Khách hàng sở hữu"
              value={vehicle.customerId ? String(vehicle.customerId) : 'Chưa gán'}
            />
            <InfoRow
              label="Trạng thái"
              value={VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status ?? 'Chưa xác định'}
            />
            <InfoRow label="Biểu tượng bản đồ" value={vehicle.iconType ?? 'Chưa cấu hình'} />
            <InfoRow label="Tạo lúc" value={formatDateTime(vehicle.createdAt)} />
            <InfoRow label="Cập nhật gần nhất" value={formatDateTime(vehicle.updatedAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Khai thác và cấu hình</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Nhiên liệu" value={vehicle.fuelType ?? 'Chưa xác định'} />
            <InfoRow label="Hộp số" value={vehicle.transmission ?? 'Chưa xác định'} />
            <InfoRow label="Số ghế" value={vehicle.seats ? String(vehicle.seats) : 'Chưa cập nhật'} />
            <InfoRow label="Odometer" value={formatMileage(vehicle.mileageKm)} />
            <InfoRow label="Màu nhận diện" value={vehicle.colorHex ?? 'Chưa cấu hình'} />
            <InfoRow label="Ghi chú vận hành" value={vehicle.notes ?? 'Chưa có ghi chú'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pháp lý và hồ sơ</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow
              label="Số đăng kiểm"
              value={vehicle.registrationNumber ?? 'Chưa cập nhật'}
            />
            <InfoRow label="Hạn bảo hiểm" value={formatDateTime(vehicle.insuranceExpiry, 'dd/MM/yyyy')} />
            <InfoRow label="Trạng thái bảo hiểm" value={insuranceBadge.label} />
            <InfoRow label="ID nội bộ" value={vehicle.id ? String(vehicle.id) : 'Chưa có'} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
