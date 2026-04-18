'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { driverServices } from '@/lib/api/drivers';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';
import type { Driver } from '../types';

const STATUS_LABELS: Record<string, string> = {
  active: 'Hoạt động',
  inactive: 'Ngưng hoạt động',
  suspended: 'Tạm ngưng',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
};

const TRIP_STATUS_LABELS: Record<string, string> = {
  planned: 'Đã lên kế hoạch',
  in_progress: 'Đang chạy',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

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

export const DriverDetailModal = ({
  open,
  onOpenChange,
  driverId,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  driverId: number | null;
}) => {
  const detailQuery = useQuery<Driver>({
    queryKey: ['driver-detail', driverId],
    queryFn: () => driverServices.getById(driverId as number),
    enabled: open && driverId !== null,
  });

  const detail = detailQuery.data;
  const assignment = detail?.assignment;
  const recentTrips = detail?.recentTrips ?? [];
  const statusLabel = STATUS_LABELS[detail?.status ?? ''] ?? detail?.status ?? 'Chưa xác định';

  const licenseStats = useMemo(() => {
    const licenseExpiryDate = detail?.licenseExpiry ? new Date(detail.licenseExpiry) : null;
    if (!licenseExpiryDate || Number.isNaN(licenseExpiryDate.getTime())) {
      return {
        label: 'Chưa có ngày hết hạn GPLX',
        variant: 'secondary' as const,
        warning: 'Nên cập nhật ngày hết hạn để hệ thống nhắc hồ sơ tài xế.',
      };
    }

    const diffDays = Math.ceil(
      (licenseExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays < 0) {
      return {
        label: `GPLX đã hết hạn ${Math.abs(diffDays)} ngày`,
        variant: 'destructive' as const,
        warning: 'Tài xế cần gia hạn GPLX trước khi tiếp tục điều phối chuyến.',
      };
    }
    if (diffDays <= 30) {
      return {
        label: `GPLX sắp hết hạn sau ${diffDays} ngày`,
        variant: 'destructive' as const,
        warning: 'Nên chủ động nhắc gia hạn để tránh gián đoạn khai thác.',
      };
    }
    return {
      label: `GPLX còn hạn ${diffDays} ngày`,
      variant: 'default' as const,
      warning: '',
    };
  }, [detail?.licenseExpiry]);

  const completeness = useMemo(() => {
    const requiredFields = [
      detail?.fullName,
      detail?.phone,
      detail?.licenseNumber,
      detail?.licenseType,
      detail?.licenseExpiry,
      detail?.address,
    ];
    const readyCount = requiredFields.filter(Boolean).length;
    return Math.round((readyCount / requiredFields.length) * 100);
  }, [detail]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Chi tiết tài xế</DialogTitle>
        </DialogHeader>

        {detailQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : detailQuery.isError ? (
          <Card className="border-destructive/40">
            <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              Không thể tải đầy đủ dữ liệu tài xế. Vui lòng thử lại.
            </CardContent>
          </Card>
        ) : detail ? (
          <div className="space-y-4">
            <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={STATUS_VARIANTS[detail.status] ?? 'secondary'}>
                        {statusLabel}
                      </Badge>
                      <Badge variant={licenseStats.variant}>{licenseStats.label}</Badge>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">
                        {detail.fullName ?? 'Tài xế chưa có tên hiển thị'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {detail.driverCode
                          ? `Mã tài xế: ${detail.driverCode}`
                          : 'Chưa cấu hình mã tài xế'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:w-[25rem]">
                    <InfoRow label="Số điện thoại" value={detail.phone ?? 'Chưa có'} />
                    <InfoRow label="Email" value={detail.email ?? 'Chưa có'} />
                    <InfoRow label="Số GPLX" value={detail.licenseNumber ?? 'Chưa có'} />
                    <InfoRow label="Hạng GPLX" value={detail.licenseType ?? 'Chưa có'} />
                  </div>
                </div>

                {licenseStats.warning ? (
                  <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    {licenseStats.warning}
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Hồ sơ tài xế</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Mức đầy đủ hồ sơ" value={`${completeness}%`} />
                  <InfoRow label="Ngày sinh" value={formatDateTime(detail.dateOfBirth, 'dd/MM/yyyy')} />
                  <InfoRow label="Ngày hết hạn GPLX" value={formatDateTime(detail.licenseExpiry, 'dd/MM/yyyy')} />
                  <InfoRow
                    label="Cập nhật gần nhất"
                    value={formatDateTime(detail.updatedAt)}
                    hint={detail.updatedAt ? formatRelative(detail.updatedAt) : undefined}
                  />
                  <InfoRow label="Tạo lúc" value={formatDateTime(detail.createdAt)} />
                  <InfoRow label="ID nội bộ" value={detail.id ? String(detail.id) : '-'} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ngữ cảnh phân công hiện tại</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <InfoRow
                    label="Xe đang phụ trách"
                    value={assignment?.activeVehicleId ?? assignment?.latestVehicleId ?? 'Chưa ghi nhận'}
                  />
                  <InfoRow
                    label="Thiết bị gần nhất"
                    value={assignment?.activeDeviceId ?? assignment?.latestDeviceId ?? 'Chưa ghi nhận'}
                  />
                  <InfoRow label="Tổng số chuyến" value={String(assignment?.tripCount ?? 0)} />
                  <InfoRow label="Chuyến đang chạy" value={String(assignment?.activeTripCount ?? 0)} />
                  <InfoRow
                    label="Mã chuyến gần nhất"
                    value={assignment?.latestTripCode ?? 'Chưa ghi nhận'}
                  />
                  <InfoRow
                    label="Trạng thái chuyến gần nhất"
                    value={
                      TRIP_STATUS_LABELS[assignment?.latestTripStatus ?? ''] ??
                      assignment?.latestTripStatus ??
                      'Chưa ghi nhận'
                    }
                  />
                  <InfoRow
                    label="Điểm đi gần nhất"
                    value={assignment?.latestStartLocation ?? 'Chưa ghi nhận'}
                  />
                  <InfoRow
                    label="Điểm đến gần nhất"
                    value={assignment?.latestEndLocation ?? 'Chưa ghi nhận'}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lịch sử chuyến gần đây</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTrips.length > 0 ? (
                  recentTrips.map((trip) => (
                    <div
                      key={trip.id}
                      className="grid gap-3 rounded-xl border bg-muted/20 px-3 py-3 text-sm md:grid-cols-4"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground">Mã chuyến</p>
                        <p className="font-medium">{trip.tripCode ?? '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phương tiện</p>
                        <p className="font-medium">{trip.vehicleId ?? 'Chưa gắn xe'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Trạng thái</p>
                        <p className="font-medium">
                          {TRIP_STATUS_LABELS[trip.status] ?? trip.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bắt đầu</p>
                        <p className="font-medium">
                          {formatDateTime(trip.actualStart ?? trip.plannedStart)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                    Chưa có dữ liệu chuyến nào gắn với tài xế này trong bảng trips.
                  </div>
                )}
              </CardContent>
            </Card>

            {detail.notes ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ghi chú điều phối</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{detail.notes}</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
