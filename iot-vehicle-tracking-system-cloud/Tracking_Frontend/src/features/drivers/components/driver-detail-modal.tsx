'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CarFront, Info, MapPinned, Radio, Route } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DeviceDetailModalContainer } from '@/features/devices/components/device-detail-modal/modal-container';
import { VehicleDetailModal } from '@/features/vehicles/components/vehicle-detail-modal';
import { deviceServices } from '@/lib/api/devices';
import { driverServices } from '@/lib/api/drivers';
import { vehicleServices } from '@/lib/api/vehicles';
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

export const DriverDetailModal = ({
  open,
  onOpenChange,
  driverId,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  driverId: number | null;
}) => {
  const [linkedDeviceOpen, setLinkedDeviceOpen] = useState(false);
  const [linkedVehicleOpen, setLinkedVehicleOpen] = useState(false);
  const detailQuery = useQuery<Driver>({
    queryKey: ['driver-detail', driverId],
    queryFn: () => driverServices.getById(driverId as number),
    enabled: open && driverId !== null,
  });

  const detail = detailQuery.data;
  const assignment = detail?.assignment;
  const recentTrips = detail?.recentTrips ?? [];
  const linkedDeviceId = assignment?.activeDeviceId ?? assignment?.latestDeviceId ?? null;
  const linkedVehicleId = assignment?.activeVehicleId ?? assignment?.latestVehicleId ?? null;
  const linkedDeviceQuery = useQuery({
    queryKey: ['driver-linked-device', linkedDeviceId],
    enabled: open && Boolean(linkedDeviceId),
    queryFn: async () => {
      const response = await deviceServices.getList({ search: linkedDeviceId ?? undefined, limit: 1 });
      return response.items?.[0] ?? null;
    },
  });
  const linkedVehicleQuery = useQuery({
    queryKey: ['driver-linked-vehicle', linkedVehicleId],
    enabled: open && Boolean(linkedVehicleId),
    queryFn: async () => {
      const response = await vehicleServices.getList({ search: linkedVehicleId ?? undefined, limit: 1 });
      return response.items?.[0] ?? null;
    },
  });
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

    const diffDays = Math.ceil((licenseExpiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
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

  const linkedDevice = linkedDeviceQuery.data ?? null;
  const linkedVehicle = linkedVehicleQuery.data ?? null;

  const profileRows = [
    { label: 'Mức đầy đủ hồ sơ', value: `${completeness}%` },
    {
      label: 'Ngày sinh',
      value: formatDateTime(detail?.dateOfBirth, 'dd/MM/yyyy'),
    },
    {
      label: 'Ngày hết hạn GPLX',
      value: formatDateTime(detail?.licenseExpiry, 'dd/MM/yyyy'),
      hint: licenseStats.label,
    },
    {
      label: 'Địa chỉ',
      value: detail?.address ?? 'Chưa có',
    },
    {
      label: 'Cập nhật gần nhất',
      value: formatDateTime(detail?.updatedAt),
      hint: detail?.updatedAt ? formatRelative(detail.updatedAt) : undefined,
    },
    { label: 'Tạo lúc', value: formatDateTime(detail?.createdAt) },
    { label: 'ID nội bộ', value: detail?.id ? String(detail.id) : '-' },
  ];

  const assignmentRows = [
    {
      label: 'Xe đang phụ trách',
      value: assignment?.activeVehicleId ?? assignment?.latestVehicleId ?? 'Chưa ghi nhận',
    },
    {
      label: 'Thiết bị gần nhất',
      value: assignment?.activeDeviceId ?? assignment?.latestDeviceId ?? 'Chưa ghi nhận',
    },
    { label: 'Tổng số chuyến', value: String(assignment?.tripCount ?? 0) },
    { label: 'Chuyến đang chạy', value: String(assignment?.activeTripCount ?? 0) },
    {
      label: 'Mã chuyến gần nhất',
      value: assignment?.latestTripCode ?? 'Chưa ghi nhận',
    },
    {
      label: 'Trạng thái chuyến gần nhất',
      value:
        TRIP_STATUS_LABELS[assignment?.latestTripStatus ?? ''] ??
        assignment?.latestTripStatus ??
        'Chưa ghi nhận',
    },
    {
      label: 'Điểm đi gần nhất',
      value: assignment?.latestStartLocation ?? 'Chưa ghi nhận',
    },
    {
      label: 'Điểm đến gần nhất',
      value: assignment?.latestEndLocation ?? 'Chưa ghi nhận',
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92dvh] w-[min(calc(100vw-1rem),1120px)] max-w-none flex-col overflow-hidden p-0 sm:w-[min(calc(100vw-4rem),1120px)] sm:max-w-none">
          <DialogHeader className="border-b px-6 py-5 pr-14">
            <DialogTitle>Chi tiết tài xế</DialogTitle>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="space-y-3 px-6 py-5">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detailQuery.isError ? (
            <div className="px-6 py-5">
              <Card className="border-destructive/40">
                <CardContent className="flex items-start gap-2 p-4 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  Không thể tải đầy đủ dữ liệu tài xế. Vui lòng thử lại.
                </CardContent>
              </Card>
            </div>
          ) : detail ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-4">
                <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
                  <CardContent className="space-y-4 p-5">
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={STATUS_VARIANTS[detail.status] ?? 'secondary'}>
                          {statusLabel}
                        </Badge>
                        <Badge variant={licenseStats.variant}>{licenseStats.label}</Badge>
                        {licenseStats.warning ? (
                          <TooltipProvider delayDuration={120}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-muted-foreground/40 text-muted-foreground transition-colors hover:text-foreground"
                                  aria-label="Thông tin giấy phép lái xe"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" sideOffset={8} className="max-w-[320px] text-xs leading-relaxed">
                                {licenseStats.warning}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : null}
                      </div>
                      <div>
                        <p className="text-2xl font-semibold tracking-tight">
                          {detail.fullName ?? 'Tài xế chưa có tên hiển thị'}
                        </p>
                        {detail.driverCode ? (
                          <p className="mt-1 text-sm text-muted-foreground">Mã tài xế: {detail.driverCode}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                      <StatCard
                        title="Số điện thoại"
                        value={detail.phone ?? 'Chưa có'}
                        className="min-w-[190px] sm:min-w-[220px]"
                      />
                      <StatCard
                        title="Email"
                        value={detail.email ?? 'Chưa có'}
                        className="min-w-[220px] sm:min-w-[260px]"
                      />
                      <StatCard
                        title="Số GPLX"
                        value={detail.licenseNumber ?? 'Chưa có'}
                        className="min-w-[180px] sm:min-w-[200px]"
                      />
                      <StatCard
                        title="Hạng GPLX"
                        value={detail.licenseType ?? 'Chưa có'}
                        className="min-w-[160px] sm:min-w-[180px]"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Lối tắt vận hành</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/dashboard/operations/map">
                        <MapPinned className="mr-2 h-4 w-4" />
                        Mở bản đồ vận hành
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!linkedDevice || linkedDeviceQuery.isLoading}
                      onClick={() => setLinkedDeviceOpen(true)}
                    >
                      <Radio className="mr-2 h-4 w-4" />
                      {linkedDevice
                        ? `Mở thiết bị ${linkedDevice.deviceId}`
                        : 'Không có thiết bị gắn'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!linkedVehicle || linkedVehicleQuery.isLoading}
                      onClick={() => setLinkedVehicleOpen(true)}
                    >
                      <CarFront className="mr-2 h-4 w-4" />
                      {linkedVehicle
                        ? `Mở phương tiện ${linkedVehicle.plateNumber ?? linkedVehicle.vehicleId}`
                        : 'Không có phương tiện gắn'}
                    </Button>
                    {assignment?.latestTripId ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/operations/trips/${assignment.latestTripId}`}>
                          <Route className="mr-2 h-4 w-4" />
                          Mở chuyến gần nhất
                        </Link>
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>

                <div className="grid gap-4 xl:grid-cols-2">
                  <DetailSection
                    title="Hồ sơ và giấy phép"
                    rows={profileRows}
                  />
                  <DetailSection
                    title="Phân công hiện tại"
                    rows={assignmentRows}
                  />
                </div>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Lịch sử chuyến gần đây</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentTrips.length > 0 ? (
                      recentTrips.map((trip) => (
                        <div
                          key={trip.id}
                          className="grid gap-3 rounded-2xl border bg-muted/10 px-4 py-3 text-sm lg:grid-cols-[minmax(0,1fr)_160px_180px_200px]"
                        >
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Chuyến đi
                            </p>
                            <p className="mt-1 font-medium text-foreground">{trip.tripCode ?? '-'}</p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Phương tiện
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {trip.vehicleId ?? 'Chưa gắn xe'}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Trạng thái
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {TRIP_STATUS_LABELS[trip.status] ?? trip.status}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Bắt đầu
                            </p>
                            <p className="mt-1 font-medium text-foreground">
                              {formatDateTime(trip.actualStart ?? trip.plannedStart)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                        Chưa có dữ liệu chuyến nào gắn với tài xế này trong bảng trips.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {detail.notes ? (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Ghi chú điều phối</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">{detail.notes}</p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <DeviceDetailModalContainer
        device={linkedDevice}
        open={linkedDeviceOpen}
        onOpenChange={setLinkedDeviceOpen}
      />

      <VehicleDetailModal
        open={linkedVehicleOpen}
        onOpenChange={setLinkedVehicleOpen}
        vehicle={linkedVehicle}
      />
    </>
  );
};
