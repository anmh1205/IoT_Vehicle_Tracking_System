/**
 * Create Vehicle Page
 */
'use client';

import { useState } from 'react';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { VehicleForm } from '@/features/vehicles/components/vehicle-form';

export default function NewVehiclePage() {
  const [open, setOpen] = useState(true);

  return (
    <PageContainer>
      <PageHeader title="Create New Vehicle" description="Add a new vehicle to your fleet" />
      <VehicleForm open={open} onOpenChange={setOpen} />
    </PageContainer>
  );
}

