'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '@/components/common/empty-state';
import { PageContainer } from '@/components/layout/PageContainer';
import { vehicleServices } from '@/lib/api/vehicles';
import { VehicleDetailContent } from '@/features/vehicles/components/vehicle-detail-content';

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
  const pageTitle = detail.plateNumber ?? detail.vehicleId ?? `Phương tiện #${id}`;
  const pageDescription =
    detail.deviceId || detail.customerId
      ? `Theo dõi hồ sơ, cấu hình và liên kết telemetry cho ${detail.vehicleId ?? 'phương tiện'}`
      : 'Phương tiện này vẫn thiếu liên kết telemetry hoặc khách hàng sở hữu';

  return (
    <PageContainer pageTitle={pageTitle} pageDescription={pageDescription}>
      <VehicleDetailContent vehicle={detail} />
    </PageContainer>
  );
};

export default VehicleDetailPage;
