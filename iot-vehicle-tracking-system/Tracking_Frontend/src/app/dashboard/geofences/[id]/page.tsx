'use client';
import { use } from 'react';
import { Crosshair, Radius, Radar, Route } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { geofenceServices } from '@/lib/api/geofences';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/common/empty-state';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const GeofenceDetailPage = ({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = use(params);
  const query = useQuery({
    queryKey: ['geofence-detail', id],
    queryFn: () => geofenceServices.getById(Number(id)),
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

  return (
    <PageContainer pageTitle={`Vùng giám sát #${id}`} pageDescription="Chi tiết vùng giám sát">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tên vùng"
          value={detail.name ?? '-'}
          icon={<Radar className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Loại vùng"
          value={detail.geofenceType ?? '-'}
          icon={<Route className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Bán kính"
          value={detail.radiusMeters ?? 0}
          subtitle="mét"
          icon={<Radius className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Trạng thái"
          value={detail.isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}
          icon={<Crosshair className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông số vùng</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
            <p className="text-xs text-muted-foreground">Mô tả</p>
            <p className="font-medium">{detail.description ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Số phương tiện đã gán</p>
            <p className="font-medium">{detail.vehicleIds?.length ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ngày tạo</p>
            <p className="font-medium">{detail.createdAt ?? '-'}</p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default GeofenceDetailPage;
