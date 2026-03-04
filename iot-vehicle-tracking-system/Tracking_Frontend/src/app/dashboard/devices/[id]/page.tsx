'use client';
import { use } from 'react';
import { Cpu, Gauge, Hash, MapPin, Radar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { PageContainer } from '@/components/layout/PageContainer';
import { EmptyState } from '@/components/common/empty-state';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DeviceDetailPage = ({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) => {
  const { id } = use(params);
  const query = useQuery({
    queryKey: ['device-detail-page', id],
    queryFn: () => deviceServices.getById(Number(id)),
  });

  if (query.isError) {
    return (
      <PageContainer pageTitle={`Thiết bị #${id}`} pageDescription="Chi tiết">
        <EmptyState
          title="Không thể tải dữ liệu"
          description="Không thể lấy thông tin thiết bị. Vui lòng thử lại."
          action={{ label: 'Thử lại', onClick: () => void query.refetch() }}
        />
      </PageContainer>
    );
  }

  const detail = query.data ?? {};

  return (
    <PageContainer pageTitle={`Thiết bị #${id}`} pageDescription="Chi tiết thiết bị IoT">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Mã thiết bị"
          value={detail.deviceId ?? '-'}
          icon={<Hash className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Trạng thái"
          value={detail.currentStatus ?? '-'}
          icon={<Cpu className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Tốc độ"
          value={detail.speed ?? 0}
          subtitle="km/h"
          icon={<Gauge className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
        <StatCard
          title="Rung động"
          value={detail.vibrationLevel ?? detail.vibrationThreshold ?? 0}
          icon={<Radar className="h-4 w-4" />}
          isLoading={query.isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin chung</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Tên thiết bị</p>
            <p className="font-medium">{detail.deviceName ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">IMEI</p>
            <p className="font-medium">{detail.imei ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phiên bản firmware</p>
            <p className="font-medium">{detail.firmwareVersion ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Biển số xe</p>
            <p className="font-medium">{detail.plateNumber ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Chu kỳ gửi dữ liệu</p>
            <p className="font-medium">{detail.requestInterval ?? '-'} giây</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cập nhật gần nhất</p>
            <p className="font-medium">{detail.lastSeenAt ?? '-'}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vị trí hiện tại</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Vĩ độ</p>
            <p className="font-medium">{detail.latitude ?? '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Kinh độ</p>
            <p className="font-medium">{detail.longitude ?? '-'}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs text-muted-foreground">Tọa độ</p>
            <p className="font-medium inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {detail.latitude ?? '-'}, {detail.longitude ?? '-'}
            </p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default DeviceDetailPage;
