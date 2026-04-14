'use client';

import { use, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Crosshair, Radius, Route } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { PageContainer } from '@/components/layout/PageContainer';
import { StatCard } from '@/components/common/stat-card';
import { GeofenceVehicleBinder } from '@/features/geofences/components/geofence-vehicle-binder';
import { GeofenceMapEditor } from '@/features/geofences/components/geofence-map-editor';
import { geofenceServices } from '@/lib/api/geofences';
import { vehicleServices } from '@/lib/api/vehicles';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { formatDateTime, formatRelative } from '@/lib/utils/date/format';

const GEOFENCE_TYPE_LABELS: Record<string, string> = {
  circle: 'Hình tròn',
  polygon: 'Đa giác',
  rectangle: 'Hình chữ nhật',
};

const TRIGGER_LABELS: Record<string, string> = {
  enter: 'Khi vào',
  exit: 'Khi ra',
  both: 'Cả hai chiều',
};

const VIOLATION_STATUS_LABELS: Record<string, string> = {
  open: 'Đang mở',
  acknowledged: 'Đã ghi nhận',
  resolved: 'Đã xử lý',
};

const VIOLATION_SEVERITY_VARIANTS: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

const hasValidCenter = (lat: number | null | undefined, lon: number | null | undefined) =>
  lat !== null &&
  lat !== undefined &&
  lon !== null &&
  lon !== undefined &&
  Number.isFinite(lat) &&
  Number.isFinite(lon);

const GeofenceDetailPage = ({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = use(params);
  const geofenceId = Number(id);
  const queryClient = useQueryClient();
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ['geofence-detail', geofenceId],
    queryFn: () => geofenceServices.getById(geofenceId),
  });

  const vehicles = useQuery({
    queryKey: ['vehicles-for-geofence-detail'],
    queryFn: () => vehicleServices.getList({ limit: 100 }),
  });

  const policyViolationsQuery = useQuery({
    queryKey: ['geofence-policy-violations', geofenceId],
    queryFn: () => geofenceServices.getPolicyViolations({ page: 1, limit: 200 }),
    enabled: query.isSuccess,
  });

  useEffect(() => {
    if (query.data?.vehicleIds) {
      setSelectedVehicleIds(query.data.vehicleIds);
    }
  }, [query.data?.vehicleIds]);

  const syncVehiclesMutation = useMutation({
    mutationFn: async () => {
      const currentVehicleIds = query.data?.vehicleIds ?? [];
      const toAssign = selectedVehicleIds.filter(
        (vehicleId: string) => !currentVehicleIds.includes(vehicleId),
      );
      const toUnassign = currentVehicleIds.filter(
        (vehicleId: string) => !selectedVehicleIds.includes(vehicleId),
      );

      await Promise.all([
        ...toAssign.map((vehicleId: string) => geofenceServices.assignVehicle(geofenceId, vehicleId)),
        ...toUnassign.map((vehicleId: string) =>
          geofenceServices.unassignVehicle(geofenceId, vehicleId),
        ),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-detail', geofenceId] });
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Lưu danh sách xe thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật danh sách phương tiện cho vùng giám sát.'),
      );
    },
  });

  if (query.isError) {
    return (
      <PageContainer pageTitle={`Vùng giám sát #${id}`} pageDescription="Chi tiết">
        <EmptyState
          title="Không thể tải dữ liệu"
          description="Không thể lấy thông tin vùng giám sát. Vui lòng thử lại."
          action={{ label: 'Thử lại', onClick: () => void query.refetch() }}
        />
      </PageContainer>
    );
  }

  const detail = query.data ?? {};
  const vehicleRows = vehicles.data?.items ?? vehicles.data?.data?.items ?? [];
  const policyViolationRows =
    policyViolationsQuery.data?.items ?? policyViolationsQuery.data?.data?.items ?? [];
  const relevantViolations = policyViolationRows.filter((violation: any) =>
    (detail.vehicleIds ?? []).includes(violation.vehicleId),
  );
  const openViolationCount = relevantViolations.filter((item: any) => item.status === 'open').length;
  const severeViolationCount = relevantViolations.filter((item: any) =>
    ['critical', 'high'].includes(String(item.severity ?? '')),
  ).length;
  const mapReady = hasValidCenter(detail.centerLatitude, detail.centerLongitude);
  const missingSignals = [
    (detail.vehicleIds ?? []).length === 0 ? 'Chưa gắn phương tiện nào vào vùng' : null,
    !detail.notifyEmail && !detail.notifyPush ? 'Đang tắt toàn bộ kênh thông báo' : null,
    !mapReady ? 'Thiếu tọa độ tâm để hiển thị bản đồ vùng' : null,
  ].filter(Boolean);

  return (
    <PageContainer
      pageTitle={detail.name ?? `Vùng giám sát #${id}`}
      pageDescription="Theo dõi vùng, phương tiện áp dụng và mức độ rủi ro chính sách theo thời gian thực"
    >
      <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant={detail.isActive ? 'default' : 'secondary'}>
                  {detail.isActive ? 'Hoạt động' : 'Ngưng hoạt động'}
                </Badge>
                <Badge variant="outline">
                  {GEOFENCE_TYPE_LABELS[detail.geofenceType] ?? detail.geofenceType ?? '-'}
                </Badge>
                <Badge variant="outline">
                  {TRIGGER_LABELS[detail.triggerOn] ?? detail.triggerOn ?? '-'}
                </Badge>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight">
                  {detail.name ?? 'Vùng giám sát chưa có tên hiển thị'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {detail.description ?? 'Chưa có mô tả mục tiêu giám sát cho vùng này.'}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:w-[25rem]">
              <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Số xe gắn vùng</p>
                <p className="mt-1 text-sm font-medium">{(detail.vehicleIds ?? []).length}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Bán kính</p>
                <p className="mt-1 text-sm font-medium">{detail.radiusMeters ?? 0} m</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Policy đang mở</p>
                <p className="mt-1 text-sm font-medium">{openViolationCount}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Mức cao/nghiêm trọng</p>
                <p className="mt-1 text-sm font-medium">{severeViolationCount}</p>
              </div>
            </div>
          </div>

          {missingSignals.length > 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
              {missingSignals.join(' • ')}. Nên hoàn thiện để vùng giám sát hoạt động đủ ngữ cảnh.
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Loại vùng" value={GEOFENCE_TYPE_LABELS[detail.geofenceType] ?? '-'} icon={<Route className="h-4 w-4" />} isLoading={query.isLoading} />
        <StatCard title="Kích hoạt" value={TRIGGER_LABELS[detail.triggerOn] ?? '-'} icon={<Radius className="h-4 w-4" />} isLoading={query.isLoading} />
        <StatCard title="Cảnh báo mở" value={openViolationCount} icon={<AlertTriangle className="h-4 w-4" />} isLoading={policyViolationsQuery.isLoading} />
        <StatCard title="Tín hiệu mạnh" value={severeViolationCount} icon={<Crosshair className="h-4 w-4" />} isLoading={policyViolationsQuery.isLoading} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bản đồ vùng giám sát</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mapReady ? (
              <GeofenceMapEditor
                lat={Number(detail.centerLatitude)}
                lon={Number(detail.centerLongitude)}
                radius={Number(detail.radiusMeters ?? 300)}
              />
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa có tọa độ tâm hợp lệ để hiển thị bản đồ vùng.
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-muted/20 px-3 py-2.5 text-sm">
                <p className="text-xs text-muted-foreground">Vĩ độ tâm</p>
                <p className="mt-1 font-medium">{detail.centerLatitude ?? '-'}</p>
              </div>
              <div className="rounded-xl border bg-muted/20 px-3 py-2.5 text-sm">
                <p className="text-xs text-muted-foreground">Kinh độ tâm</p>
                <p className="mt-1 font-medium">{detail.centerLongitude ?? '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quản lý phương tiện áp dụng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <GeofenceVehicleBinder
              vehicles={vehicleRows}
              selected={selectedVehicleIds}
              onChange={setSelectedVehicleIds}
            />
            <div className="flex justify-end">
              <Button disabled={syncVehiclesMutation.isPending} onClick={() => syncVehiclesMutation.mutate()}>
                Lưu danh sách xe
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vi phạm chính sách gần đây</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {relevantViolations.length > 0 ? (
              relevantViolations.slice(0, 8).map((item: any) => (
                <div key={item.id} className="rounded-xl border bg-muted/20 px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={VIOLATION_SEVERITY_VARIANTS[item.severity] ?? 'secondary'}>
                      {String(item.severity ?? '-').toUpperCase()}
                    </Badge>
                    <Badge variant="outline">
                      {VIOLATION_STATUS_LABELS[item.status] ?? item.status ?? '-'}
                    </Badge>
                  </div>
                  <p className="mt-2 font-medium">
                    {item.vehicleId ?? '-'} • {item.violationKind ?? 'policy_violation'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(item.detectedAt)} ({formatRelative(item.detectedAt)})
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
                Chưa ghi nhận vi phạm chính sách gắn với các phương tiện trong vùng này.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mốc quản trị</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">Tạo lúc</p>
              <p className="mt-1 text-sm font-medium">{formatDateTime(detail.createdAt)}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">Cập nhật gần nhất</p>
              <p className="mt-1 text-sm font-medium">{formatDateTime(detail.updatedAt)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{formatRelative(detail.updatedAt)}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">Kênh thông báo</p>
              <p className="mt-1 text-sm font-medium">
                {detail.notifyEmail ? 'Email bật' : 'Email tắt'} • {detail.notifyPush ? 'Push bật' : 'Push tắt'}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/20 px-4 py-3">
              <p className="text-xs text-muted-foreground">Màu vùng hiển thị</p>
              <p className="mt-1 text-sm font-medium inline-flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full border" style={{ backgroundColor: detail.color ?? '#2563eb' }} />
                {detail.color ?? '#2563eb'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default GeofenceDetailPage;
