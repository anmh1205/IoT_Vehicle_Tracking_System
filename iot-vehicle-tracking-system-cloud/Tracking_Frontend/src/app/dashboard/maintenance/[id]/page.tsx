'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { PageContainer } from '@/components/layout/PageContainer';
import { alertServices, localizeAlertForDisplay } from '@/lib/api/alerts';
import { customerServices } from '@/lib/api/customers';
import { maintenanceServices } from '@/lib/api/maintenance';
import { vehicleServices } from '@/lib/api/vehicles';
import { formatDateTime, formatNumber, formatRelative } from '@/lib/utils/date/format';
import {
  MAINTENANCE_STATUS_BADGE_VARIANTS,
  MAINTENANCE_STATUS_LABELS,
  formatMaintenanceDescription,
  formatMaintenanceTitle,
  getMaintenanceTypeLabel,
} from '@/features/maintenance/maintenance-meta';

const LOOKUP_LIMIT = 100;

const InfoRow = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
    <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-medium">{value}</p>
    {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);

const formatCost = (value: number | null | undefined) =>
  value === null || value === undefined ? 'Chưa có' : `${formatNumber(value)} VND`;

const formatMileage = (value: number | null | undefined) =>
  value === null || value === undefined ? 'Chưa có' : `${formatNumber(value)} km`;

const MaintenanceDetailPage = ({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = use(params);
  const query = useQuery({
    queryKey: ['maintenance-detail', id],
    queryFn: () => maintenanceServices.getById(Number(id)),
  });

  const vehiclesQuery = useQuery({
    queryKey: ['maintenance-detail-vehicles'],
    queryFn: () => vehicleServices.getList({ limit: LOOKUP_LIMIT }),
  });

  const customersQuery = useQuery({
    queryKey: ['maintenance-detail-customers'],
    queryFn: () => customerServices.getList({ limit: LOOKUP_LIMIT }),
  });

  const relatedAlertsQuery = useQuery({
    queryKey: ['maintenance-related-alerts', query.data?.vehicleId],
    queryFn: () =>
      alertServices.getList({
        page: 1,
        limit: 6,
        status: 'active',
        alertType: 'maintenance_due',
        vehicleId: query.data?.vehicleId,
      }),
    enabled: Boolean(query.data?.vehicleId),
  });

  if (query.isError) {
    return (
      <PageContainer pageTitle={`Bảo trì #${id}`} pageDescription="Chi tiết">
        <EmptyState
          title="Không thể tải dữ liệu"
          description="Không thể lấy thông tin bảo trì. Vui lòng thử lại."
          action={{ label: 'Thử lại', onClick: () => void query.refetch() }}
        />
      </PageContainer>
    );
  }

  const detail = query.data ?? {};
  const vehicles = vehiclesQuery.data?.items ?? vehiclesQuery.data?.data?.items ?? [];
  const customers = customersQuery.data?.items ?? customersQuery.data?.data?.items ?? [];
  const relatedAlerts = (
    relatedAlertsQuery.data?.items ?? relatedAlertsQuery.data?.data?.items ?? []
  ).map((alert: any) => localizeAlertForDisplay(alert));
  const vehicle = vehicles.find((item: any) => item.vehicleId === detail.vehicleId) ?? null;
  const customer = vehicle?.customerId
    ? customers.find((item: any) => item.id === vehicle.customerId) ?? null
    : null;
  const statusLabel = MAINTENANCE_STATUS_LABELS[detail.status] ?? detail.status ?? 'Chưa xác định';
  const typeLabel = getMaintenanceTypeLabel(detail.maintenanceType);
  const displayTitle = formatMaintenanceTitle(detail);
  const displayDescription = formatMaintenanceDescription(detail);
  const pageTitle = displayTitle || `Bảo trì #${id}`;
  const vehicleLabel = detail.vehicleId
    ? vehicle?.plateNumber
      ? `${vehicle.plateNumber} - ${detail.vehicleId}`
      : detail.vehicleId
    : 'Chưa gắn phương tiện';
  const missingSignals = [
    !detail.vehicleId ? 'Chưa liên kết phương tiện' : null,
    !customer?.name ? 'Chưa có thông tin khách hàng' : null,
    !detail.scheduledDate && detail.status !== 'completed' ? 'Chưa có lịch hẹn xử lý' : null,
    !detail.serviceProvider ? 'Chưa có đơn vị thực hiện' : null,
  ].filter(Boolean);

  return (
    <PageContainer pageTitle={pageTitle} pageDescription="Theo dõi tiến trình bảo trì, xe và cảnh báo liên quan">
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={MAINTENANCE_STATUS_BADGE_VARIANTS[detail.status] ?? 'secondary'}>
                  {statusLabel}
                </Badge>
                <Badge variant="outline">{typeLabel}</Badge>
                {customer?.name ? <Badge variant="outline">{customer.name}</Badge> : null}
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {displayTitle}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{vehicleLabel}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[25rem]">
              <InfoRow label="Ngày hẹn" value={formatDateTime(detail.scheduledDate, 'dd/MM/yyyy')} />
              <InfoRow
                label="Ngày hoàn tất"
                value={formatDateTime(detail.completedDate, 'dd/MM/yyyy')}
                hint={detail.completedDate ? formatRelative(detail.completedDate) : undefined}
              />
              <InfoRow label="Chi phí dự kiến" value={formatCost(detail.cost)} />
              <InfoRow label="Đơn vị xử lý" value={detail.serviceProvider ?? 'Chưa có'} />
            </div>
          </div>

          {missingSignals.length > 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
              {missingSignals.join(' • ')}. Nên hoàn thiện để phiếu bảo trì đủ thông tin vận hành.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin công việc</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Phương tiện" value={vehicleLabel} />
            <InfoRow label="Loại bảo trì" value={typeLabel} />
            <InfoRow label="Khách hàng" value={customer?.name ?? 'Chưa liên kết khách hàng'} />
            <InfoRow label="Thiết bị" value={vehicle?.deviceId ?? 'Chưa gắn thiết bị'} />
            <InfoRow label="Trạng thái" value={statusLabel} />
            <InfoRow label="Đơn vị xử lý" value={detail.serviceProvider ?? 'Chưa cập nhật'} />
            <InfoRow label="Mô tả" value={displayDescription || 'Chưa có mô tả'} />
            <InfoRow label="ID nội bộ" value={detail.id ? String(detail.id) : 'Chưa có'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mốc km và chi phí</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Km tại thời điểm bảo trì" value={formatMileage(detail.mileageAtService)} />
            <InfoRow label="Mốc km bảo trì tiếp theo" value={formatMileage(detail.nextServiceMileage)} />
            <InfoRow
              label="Ngày nhắc lần sau"
              value={formatDateTime(detail.nextServiceDate, 'dd/MM/yyyy')}
            />
            <InfoRow label="Chi phí ghi nhận" value={formatCost(detail.cost)} />
            <InfoRow label="Công tơ mét xe" value={formatMileage(vehicle?.mileageKm)} />
            <InfoRow label="Cập nhật gần nhất" value={formatDateTime(detail.updatedAt)} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Cảnh báo bảo trì liên quan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {relatedAlerts.length > 0 ? (
              relatedAlerts.map((alert: any) => (
                <div key={alert.id} className="rounded-xl border bg-muted/20 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{String(alert.severity ?? 'medium').toUpperCase()}</Badge>
                    <Badge variant="secondary">{alert.status ?? 'active'}</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold">
                    {alert.displayTitle ?? alert.title ?? 'Cảnh báo bảo trì'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {alert.displayMessage ?? alert.message ?? 'Chưa có mô tả chi tiết từ cảnh báo.'}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatDateTime(alert.createdAt)} ({formatRelative(alert.createdAt)})
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Không có cảnh báo bảo trì đang mở gắn với phương tiện này.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Dòng thời gian xử lý</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-sm font-semibold">Lên lịch bảo trì</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.scheduledDate
                  ? `Hẹn ${formatDateTime(detail.scheduledDate)}`
                  : 'Chưa có ngày hẹn'}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-sm font-semibold">Thực hiện</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.status === 'in_progress'
                  ? 'Công việc đang được xử lý.'
                  : detail.status === 'completed'
                    ? 'Đã hoàn tất và đóng phiếu.'
                    : detail.status === 'cancelled'
                      ? 'Phiếu đã bị hủy.'
                      : 'Đang chờ triển khai.'}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-sm font-semibold">Kết thúc</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.completedDate
                  ? `Hoàn tất lúc ${formatDateTime(detail.completedDate)}`
                  : 'Chưa có mốc hoàn tất'}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-sm font-semibold">Ghi chú kỹ thuật</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {detail.notes ?? 'Chưa có ghi chú kỹ thuật từ tổ bảo trì.'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default MaintenanceDetailPage;
