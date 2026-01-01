/**
 * Vehicle Details Page
 */
'use client';

import { use } from 'react';
import { notFound, useParams } from 'next/navigation';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { VehicleDetails } from '@/features/vehicles/components/vehicle-details';

export default function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const vehicleId = parseInt(id);

  if (isNaN(vehicleId)) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeader title="Vehicle Details" />
      <VehicleDetails vehicleId={vehicleId} />
    </PageContainer>
  );
}

