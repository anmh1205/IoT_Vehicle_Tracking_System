'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceServices } from '@/lib/api/devices';
import { PageContainer } from '@/components/layout/PageContainer';
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
  return (
    <PageContainer pageTitle={`Thiết bị #${id}`} pageDescription="Chi tiết">
      <pre className="rounded border p-3 text-xs">{JSON.stringify(query.data, null, 2)}</pre>
    </PageContainer>
  );
};
export default DeviceDetailPage;
