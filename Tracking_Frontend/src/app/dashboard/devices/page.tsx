'use client';

import { useState } from 'react';
import { Plus, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useDevices } from '@/features/devices/hooks/use-devices';
import { useDeleteDevice } from '@/features/devices/hooks/use-delete-device';
import { useDeviceRealtime } from '@/features/devices/hooks/use-device-realtime';
import { getDeviceColumns } from '@/features/devices/components/device-columns';
import { DeviceForm } from '@/features/devices/components/device-form';
import { DeviceDetailSheet } from '@/features/devices/components/device-detail-sheet';
import { DeviceFilters } from '@/features/devices/components/device-filters';
import type { DeviceFilters as FilterType } from '@/lib/api/devices';

export default function DevicesPage() {
  const [filters, setFilters] = useState<FilterType>({ page: 1, limit: 20 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<any | null>(null);
  const [viewDevice, setViewDevice] = useState<any | null>(null);
  const [deleteDevice, setDeleteDevice] = useState<any | null>(null);

  const devicesQuery = useDevices(filters);
  const deleteMutation = useDeleteDevice();
  useDeviceRealtime();

  const rows = devicesQuery.data?.items ?? devicesQuery.data?.data?.items ?? [];

  return (
    <PageContainer
      pageTitle="Thiết bị"
      pageDescription="Quản lý thiết bị IoT"
      pageHeaderAction={<Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Thêm thiết bị</Button>}
    >
      <DataTable
        columns={getDeviceColumns({ onView: setViewDevice, onEdit: setEditDevice, onDelete: setDeleteDevice })}
        data={rows}
        searchKey="deviceName"
        searchPlaceholder="Tìm thiết bị..."
        isLoading={devicesQuery.isLoading}
        emptyIcon={<Cpu className="h-10 w-10" />}
        emptyTitle="Chưa có thiết bị"
        emptyAction={{ label: 'Thêm thiết bị', onClick: () => setCreateOpen(true) }}
        toolbar={<DeviceFilters filters={filters} onChange={setFilters} />}
      />

      <DeviceForm open={createOpen || !!editDevice} onOpenChange={(v) => { if (!v) { setCreateOpen(false); setEditDevice(null); } }} defaultValues={editDevice ?? undefined} />
      <DeviceDetailSheet device={viewDevice} open={!!viewDevice} onOpenChange={(v) => !v && setViewDevice(null)} />

      <ConfirmDialog
        open={!!deleteDevice}
        onCancel={() => setDeleteDevice(null)}
        onConfirm={() => {
          if (!deleteDevice) return;
          deleteMutation.mutate(deleteDevice.id, { onSuccess: () => setDeleteDevice(null) });
        }}
        title="Xóa thiết bị"
        description={`Bạn có chắc muốn xóa ${deleteDevice?.deviceName ?? ''}?`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
}


