'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { geofenceServices } from '@/lib/api/geofences';
import { PageContainer } from '@/components/layout/PageContainer';
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
  return (
    <PageContainer pageTitle={`Vùng giám sát #${id}`} pageDescription="Chi tiết">
      <pre className="rounded border p-3 text-xs">{JSON.stringify(query.data, null, 2)}</pre>
    </PageContainer>
  );
};
export default GeofenceDetailPage;
