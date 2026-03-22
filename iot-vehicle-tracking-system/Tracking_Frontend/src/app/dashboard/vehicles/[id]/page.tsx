'use client';

import { use } from 'react';
import { CarFront, Calendar, CircleOff, Hash } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { vehicleServices } from '@/lib/api/vehicles';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/common/empty-state';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
  inactive: 'Ngưng hoạt động',
  maintenance: 'Đang bảo trì',
  retired: 'Ngưng khai thác',
};

const VehicleDetailPage = ({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = use(params);
  const query = useQuery({
    queryKey: ['vehicle-detail', id],
    queryFn: () => vehicleServices.getById(Number(id)),
  });

  if (query.isError) {
    return (
      <PageContainer pageTitle={`Phương tiện #${id}`} pageDescription="Chi tiết">
        <EmptyState
          title="Không thể tải dữ liệu"
          description="Không thể lấy thông tin phương tiện. Vui lòng thử lại."
          action={{ label: 'Thử lại', onClick: () => void query.refetch() }}
        />
      </PageContainer>
    );
  }

  const detail = query.data ?? {};

  return (
    <PageContainer
      pageTitle={`Phương tiện #${id}`}
      pageDescription={detail.plateNumber ?? 'Chi tiết phương tiện và ngữ cảnh thiết bị đang gắn'}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Mã xe" value={detail.vehicleId ?? '-'} icon={<Hash className="h-4 w-4" />} isLoading={query.isLoading} />
        <StatCard title="Biển số" value={detail.plateNumber ?? '-'} icon={<CarFront className="h-4 w-4" />} isLoading={query.isLoading} />
        <StatCard title="Trạng thái" value={STATUS_LABELS[detail.status] ?? detail.status ?? '-'} icon={<CircleOff className="h-4 w-4" />} isLoading={query.isLoading} />
        <StatCard title="Năm sản xuất" value={detail.year ?? '-'} icon={<Calendar className="h-4 w-4" />} isLoading={query.isLoading} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thông tin nhận diện</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Hãng xe</p>
              <p className="font-medium">{detail.brand ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Dòng xe</p>
              <p className="font-medium">{detail.model ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Màu sơn</p>
              <p className="font-medium">{detail.color ?? '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">VIN</p>
              <p className="font-medium">{detail.vin ?? '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ngữ cảnh vận hành</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Khách hàng</p>
              <p className="font-medium">{detail.customerId ?? 'Chưa gán khách hàng'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Thiết bị gắn kèm</p>
              <p className="font-medium">{detail.deviceId ?? 'Chưa gán thiết bị'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nhiên liệu</p>
              <p className="font-medium">{detail.fuelType ?? 'Chưa xác định'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Số ghế</p>
              <p className="font-medium">{detail.seats ?? '-'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Ghi chú</p>
              <p className="font-medium">{detail.notes ?? 'Chưa có ghi chú vận hành'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default VehicleDetailPage;
