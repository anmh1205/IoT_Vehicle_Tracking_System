'use client';

import { use, useEffect, useState } from 'react';
import { Crosshair, Radius, Radar, Route } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { geofenceServices } from '@/lib/api/geofences';
import { vehicleServices } from '@/lib/api/vehicles';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/common/empty-state';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GeofenceVehicleBinder } from '@/features/geofences/components/geofence-vehicle-binder';

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

  return (
    <PageContainer
      pageTitle={`Vùng giám sát #${id}`}
      pageDescription={detail.name ?? 'Chi tiết vùng giám sát và danh sách xe áp dụng'}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tên vùng" value={detail.name ?? '-'} icon={<Radar className="h-4 w-4" />} isLoading={query.isLoading} />
        <StatCard title="Loại vùng" value={detail.geofenceType ?? '-'} icon={<Route className="h-4 w-4" />} isLoading={query.isLoading} />
        <StatCard title="Bán kính" value={detail.radiusMeters ?? 0} subtitle="mét" icon={<Radius className="h-4 w-4" />} isLoading={query.isLoading} />
        <StatCard title="Trạng thái" value={detail.isActive ? 'Hoạt động' : 'Ngưng hoạt động'} icon={<Crosshair className="h-4 w-4" />} isLoading={query.isLoading} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông số vùng</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Vĩ độ tâm</p>
              <p className="font-medium">{detail.centerLatitude ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kinh độ tâm</p>
              <p className="font-medium">{detail.centerLongitude ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kiểu kích hoạt</p>
              <p className="font-medium">{detail.triggerOn ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Số phương tiện đã gán</p>
              <p className="font-medium">{detail.vehicleIds?.length ?? 0}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Mô tả</p>
              <p className="font-medium">{detail.description ?? 'Chưa có mô tả'}</p>
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
    </PageContainer>
  );
};

export default GeofenceDetailPage;
