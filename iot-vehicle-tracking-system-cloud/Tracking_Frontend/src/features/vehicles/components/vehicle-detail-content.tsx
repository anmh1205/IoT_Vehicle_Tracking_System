'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatCard } from '@/components/common/stat-card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateTime, formatNumber } from '@/lib/utils/date/format';
import { AllowedZoneSetupSheet } from '@/features/geofences/components/allowed-zone-setup-sheet';
import { AllowedZoneStatusCard } from '@/features/geofences/components/allowed-zone-status-card';
import { useRoleAccess } from '@/hooks/use-role-access';

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

const DetailRow = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="grid gap-1 py-3 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-4">
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    </div>
    <div className="min-w-0">
      <p className="text-sm font-medium leading-6 text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  </div>
);

const DetailSection = ({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: string; hint?: string }>;
}) => (
  <Card>
    <CardHeader className="px-4 pt-3 pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="px-4 pb-4">
      <div className="divide-y rounded-2xl border bg-muted/10 px-4">
        {rows.map((row) => (
          <DetailRow key={row.label} label={row.label} value={row.value} hint={row.hint} />
        ))}
      </div>
    </CardContent>
  </Card>
);

export const VehicleDetailContent = ({
  vehicle,
  compact = false,
}: {
  vehicle: any | null;
  compact?: boolean;
}) => {
  const [allowedZoneOpen, setAllowedZoneOpen] = useState(false);
  const access = useRoleAccess();
  if (!vehicle) {
    return null;
  }

  const insuranceBadge = getInsuranceBadge(vehicle.insuranceExpiry);
  const customerLabel = getCustomerLabel(vehicle);
  const statusLabel =
    VEHICLE_STATUS_LABELS[vehicle.status] ?? formatValue(vehicle.status, 'Chưa xác định');
  const missingAssignments = [
    !vehicle.deviceId ? 'Chưa gắn thiết bị telemetry' : null,
    !vehicle.customerId ? 'Chưa gắn khách hàng sở hữu' : null,
  ].filter(Boolean);

  const operationsRows = [
    { label: 'Trạng thái', value: statusLabel },
    { label: 'Biểu tượng bản đồ', value: formatValue(vehicle.iconType, 'Mặc định') },
    { label: 'Nhiên liệu', value: formatValue(vehicle.fuelType, 'Chưa xác định') },
    { label: 'Hộp số', value: formatValue(vehicle.transmission, 'Chưa xác định') },
    { label: 'Ghi chú vận hành', value: formatValue(vehicle.notes, 'Chưa có ghi chú') },
  ];

  const identityRows = [
    { label: 'Mã xe', value: formatValue(vehicle.vehicleId, 'Chưa có') },
    { label: 'Biển số', value: formatValue(vehicle.plateNumber, 'Chưa có') },
    { label: 'Hãng xe', value: formatValue(vehicle.brand) },
    { label: 'Dòng xe', value: formatValue(vehicle.model) },
    {
      label: 'Loại xe',
      value: formatValue(vehicle.vehicleType, 'Chưa phân loại'),
    },
    {
      label: 'Năm sản xuất',
      value: vehicle.year ? String(vehicle.year) : 'Chưa cập nhật',
    },
    { label: 'Màu sơn', value: formatValue(vehicle.color) },
    { label: 'VIN', value: formatValue(vehicle.vin) },
    {
      label: 'Số đăng kiểm',
      value: formatValue(vehicle.registrationNumber, 'Chưa cập nhật'),
    },
    {
      label: 'Hạn bảo hiểm',
      value: formatDateTime(vehicle.insuranceExpiry, 'dd/MM/yyyy'),
      hint: insuranceBadge.label,
    },
    { label: 'Tạo lúc', value: formatDateTime(vehicle.createdAt) },
    { label: 'Cập nhật gần nhất', value: formatDateTime(vehicle.updatedAt) },
  ];

  return (
    <div className={cn('space-y-4', compact && 'space-y-3')}>
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className={cn('space-y-4', compact ? 'p-4' : 'p-5')}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={VEHICLE_STATUS_VARIANTS[vehicle.status] ?? 'secondary'}>
                {statusLabel}
              </Badge>
              <Badge variant={vehicle.deviceId ? 'secondary' : 'outline'}>
                {vehicle.deviceId ? 'Đã gắn telemetry' : 'Thiếu thiết bị telemetry'}
              </Badge>
              <Badge variant={insuranceBadge.variant}>{insuranceBadge.label}</Badge>
              {missingAssignments.length > 0 ? (
                <TooltipProvider delayDuration={120}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Thông tin trạng thái gán phương tiện"
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={8} className="max-w-[320px] text-xs leading-relaxed">
                      {missingAssignments.join(' • ')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : null}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <StatCard
              title="Thiết bị gắn"
              value={formatValue(vehicle.deviceId, 'Chưa gắn')}
              className="min-w-[180px] sm:min-w-[200px]"
            />
            <StatCard
              title="Khách hàng"
              value={customerLabel}
              className="min-w-[180px] sm:min-w-[220px]"
            />
            <StatCard
              title="Odometer"
              value={formatMileage(vehicle.mileageKm)}
              className="min-w-[180px] sm:min-w-[200px]"
            />
            <StatCard
              title="Số ghế"
              value={vehicle.seats ? String(vehicle.seats) : 'Chưa cập nhật'}
              className="min-w-[160px] sm:min-w-[180px]"
            />
          </div>
        </CardContent>
      </Card>

      <AllowedZoneStatusCard
        vehicleId={vehicle.vehicleId ?? null}
        title="Vùng"
        canEdit={access.canEditDevice && Boolean(vehicle.vehicleId)}
        onConfigure={() => setAllowedZoneOpen(true)}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <DetailSection
          title="Thông tin vận hành"
          rows={operationsRows}
        />
        <DetailSection
          title="Nhận diện và pháp lý"
          rows={identityRows}
        />
      </div>

      <AllowedZoneSetupSheet
        open={allowedZoneOpen}
        onOpenChange={setAllowedZoneOpen}
        vehicleId={vehicle.vehicleId ?? null}
        vehicleLabel={vehicle.plateNumber ?? vehicle.vehicleId ?? null}
        canEdit={access.canEditDevice && Boolean(vehicle.vehicleId)}
      />
    </div>
  );
};
