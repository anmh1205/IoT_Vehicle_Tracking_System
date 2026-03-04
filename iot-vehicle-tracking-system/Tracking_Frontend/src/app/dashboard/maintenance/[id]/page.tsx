'use client';
import { use } from 'react';
import { CalendarClock, CircleCheckBig, ClockArrowUp, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { maintenanceServices } from '@/lib/api/maintenance';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/common/empty-state';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

  return (
    <PageContainer pageTitle={`Bảo trì #${id}`} pageDescription="Chi tiết lịch bảo trì">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Loại bảo trì"
          value={detail.maintenanceType ?? '-'}
          icon={<Wrench className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Trạng thái"
          value={detail.status ?? '-'}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Ngày hẹn"
          value={detail.scheduledDate ?? '-'}
          icon={<CalendarClock className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Ngày hoàn tất"
          value={detail.completedDate ?? '-'}
          icon={<ClockArrowUp className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin công việc bảo trì</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Phương tiện</p>
            <p className="font-medium">{detail.vehicleId ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mã công việc</p>
            <p className="font-medium">{detail.taskCode ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Chi phí dự kiến</p>
            <p className="font-medium">{detail.estimatedCost ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Chi phí thực tế</p>
            <p className="font-medium">{detail.actualCost ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Đồng hồ xe tại thời điểm bảo trì</p>
            <p className="font-medium">{detail.odometerKm ?? '-'} km</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ghi chú</p>
            <p className="font-medium">{detail.notes ?? '-'}</p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default MaintenanceDetailPage;
