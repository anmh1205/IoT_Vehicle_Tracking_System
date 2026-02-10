'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vehicleServices } from '@/lib/api/vehicles';
import { PageContainer } from '@/components/layout/PageContainer';

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useQuery({ queryKey: ['vehicle-detail', id], queryFn: () => vehicleServices.getById(Number(id)) });

  return (
    <PageContainer pageTitle={`Phương tiện #${id}`} pageDescription='Chi tiết'>
      <pre className='rounded border p-3 text-xs'>{JSON.stringify(query.data, null, 2)}</pre>
    </PageContainer>
  );
}

