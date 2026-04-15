'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { driverServices } from '@/lib/api/drivers';
import { tripServices } from '@/lib/api/trips';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

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
  const detailQuery = useQuery({
    queryKey: ['driver-detail', driverId],
    queryFn: () => driverServices.getById(driverId as number),
    enabled: open && driverId !== null,
  });

  const tripQuery = useQuery({
    queryKey: ['driver-detail-trips', driverId, detailQuery.data?.fullName],
    queryFn: async () => {
      const payload = await tripServices.getList({
        page: 1,
        limit: 6,
        search: detailQuery.data?.fullName ?? '',
      });
      const items = payload?.items ?? payload?.data?.items ?? [];
      return items.filter((trip: any) =>
        String(trip?.driverName ?? '')
          .toLowerCase()
          .includes(String(detailQuery.data?.fullName ?? '').toLowerCase()),
      );
    },
    enabled: open && Boolean(detailQuery.data?.fullName),
  });

  const detail = detailQuery.data ?? {};
  const statusLabel = STATUS_LABELS[detail.status] ?? detail.status ?? 'Chưa xác định';

  const licenseStats = useMemo(() => {
    const licenseExpiryDate = detail.licenseExpiry ? new Date(detail.licenseExpiry) : null;
    if (!licenseExpiryDate || Number.isNaN(licenseExpiryDate.getTime())) {
      return {
        label: 'Chưa có ngày hết hạn GPLX',
        variant: 'secondary' as const,
        warning: 'Nên cập nhật ngày hết hạn để hệ thống nhắc bảo trì hồ sơ lái xe.',
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
  }, [detail.licenseExpiry]);

  const completeness = useMemo(() => {
    const requiredFields = [
      detail.fullName,
      detail.phone,
      detail.licenseNumber,
      detail.licenseType,
      detail.licenseExpiry,
      detail.address,
    ];
    const readyCount = requiredFields.filter(Boolean).length;
    return Math.round((readyCount / requiredFields.length) * 100);
  }, [
    detail.address,
    detail.fullName,
    detail.licenseExpiry,
    detail.licenseNumber,
    detail.licenseType,
    detail.phone,
  ]);

  const recentTrips = tripQuery.data ?? [];

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
        ) : (
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
                  <CardTitle className="text-base">Tín hiệu vận hành</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <InfoRow
                    label="Liên hệ trực tiếp"
                    value={detail.phone ? 'Đủ' : 'Thiếu'}
                    hint={detail.phone ? 'Có thể gọi điều phối ngay' : 'Nên bổ sung để tránh trễ xử lý'}
                  />
                  <InfoRow
                    label="Kênh email"
                    value={detail.email ? 'Đủ' : 'Thiếu'}
                    hint={detail.email ? 'Có thể gửi thông báo văn bản' : 'Nên bổ sung cho cảnh báo chính thức'}
                  />
                  <InfoRow
                    label="Trạng thái bằng lái"
                    value={licenseStats.label}
                    hint={
                      licenseStats.variant === 'destructive'
                        ? 'Rủi ro gián đoạn khai thác'
                        : 'Sẵn sàng vận hành'
                    }
                  />
                  <InfoRow
                    label="Số chuyến gần đây"
                    value={String(recentTrips.length)}
                    hint={tripQuery.isLoading ? 'Đang tải lịch sử chuyến' : 'Lọc theo tên tài xế'}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hành trình gần đây theo tài xế</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tripQuery.isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : recentTrips.length > 0 ? (
                  recentTrips.map((trip: any) => (
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
                        <p className="font-medium">{trip.status ?? '-'}</p>
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
                    Chưa thấy hành trình khớp theo tên tài xế này. Nếu đội xe đã có chuyến, cần chuẩn hóa
                    trường driverName khi tạo chuyến.
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

            {detailQuery.isError ? (
              <Card className="border-destructive/40">
                <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  Không thể tải đầy đủ dữ liệu tài xế. Vui lòng thử lại.
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};
