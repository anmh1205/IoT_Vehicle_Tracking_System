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
      <PageContainer pageTitle={`Phương tiện #${id}`} pageDescription="Chi tiết phương tiện">
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
  const pageDescription = 'Chi tiết phương tiện';

  return (
    <PageContainer pageTitle={pageTitle} pageDescription={pageDescription}>
      <VehicleDetailContent vehicle={detail} />
    </PageContainer>
  );
};

export default VehicleDetailPage;
