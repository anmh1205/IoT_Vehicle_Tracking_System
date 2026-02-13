'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { maintenanceServices } from '@/lib/api/maintenance';
import { PageContainer } from '@/components/layout/PageContainer';
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
  return (
    <PageContainer pageTitle={`Bảo trì #${id}`} pageDescription="Chi tiết">
      <pre className="rounded border p-3 text-xs">{JSON.stringify(query.data, null, 2)}</pre>
    </PageContainer>
  );
};
export default MaintenanceDetailPage;
