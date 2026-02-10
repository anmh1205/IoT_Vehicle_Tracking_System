'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customerServices } from '@/lib/api/customers';
import { PageContainer } from '@/components/layout/PageContainer';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const query = useQuery({ queryKey: ['customer-detail', id], queryFn: () => customerServices.getById(Number(id)) });

  return (
    <PageContainer pageTitle={`Khách hàng #${id}`} pageDescription='Chi tiết'>
      <pre className='rounded border p-3 text-xs'>{JSON.stringify(query.data, null, 2)}</pre>
    </PageContainer>
  );
}

