'use client';
import { useState } from 'react';
import { Cpu, LayoutGrid, Plus, Table2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/common/data-table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import type { DeviceFilters as DeviceFiltersParams } from '@/lib/api/devices';
import type { Device } from '@/features/devices/types';
import { useDevices } from '@/features/devices/hooks/use-devices';
import { useDeleteDevice } from '@/features/devices/hooks/use-delete-device';
import { useDeviceRealtime } from '@/features/devices/hooks/use-device-realtime';
import { getDeviceColumns } from '@/features/devices/components/device-columns';
import { DeviceFilters } from '@/features/devices/components/device-filters';
import { DeviceStatsBar } from '@/features/devices/components/device-stats-bar';
import { DeviceGrid } from '@/features/devices/components/device-grid';
import { DeviceCardSkeletonGrid } from '@/features/devices/components/device-skeletons';
import { MobileDeviceHeader } from '@/features/devices/components/mobile-device-header';
import { MobileTabSelector } from '@/features/devices/components/mobile-tab-selector';
import { DeviceCreateModal } from '@/features/devices/components/device-create-modal';
import { DeviceEditModal } from '@/features/devices/components/device-edit-modal';
import { DeviceDetailModalContainer } from '@/features/devices/components/device-detail-modal/modal-container';
type ViewMode = 'table' | 'cards';
const DevicesPage = () => {
  const [filters, setFilters] = useState<DeviceFiltersParams>({ page: 1, limit: 20 });
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [createOpen, setCreateOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [viewDevice, setViewDevice] = useState<Device | null>(null);
  const [deleteDevice, setDeleteDevice] = useState<Device | null>(null);
  const devicesQuery = useDevices(filters);
  const deleteMutation = useDeleteDevice();
  useDeviceRealtime();
  const rows = devicesQuery.data?.items ?? [];
  return (
    <PageContainer
      pageTitle="Thiet bi"
      pageDescription="Quan ly thiet bi IoT"
      pageHeaderAction={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Them thiet bi
        </Button>
      }
    >
      <MobileDeviceHeader onCreate={() => setCreateOpen(true)} />

      <DeviceStatsBar devices={rows} />

      <Tabs
        value={viewMode}
        onValueChange={(value) => setViewMode(value as ViewMode)}
        className="space-y-4"
      >
        <div className="flex items-center justify-between gap-2">
          <MobileTabSelector />
          <TabsList className="hidden sm:grid sm:grid-cols-2">
            <TabsTrigger value="table">
              <Table2 className="mr-2 h-4 w-4" />
              Bang du lieu
            </TabsTrigger>
            <TabsTrigger value="cards">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Card view
            </TabsTrigger>
          </TabsList>
          <div className="hidden sm:block">
            <DeviceFilters filters={filters} onChange={setFilters} />
          </div>
        </div>

        <div className="sm:hidden">
          <DeviceFilters filters={filters} onChange={setFilters} />
        </div>

        <TabsContent value="table" className="space-y-0">
          <DataTable
            columns={getDeviceColumns({
              onView: setViewDevice,
              onEdit: setEditDevice,
              onDelete: setDeleteDevice,
            })}
            data={rows}
            isLoading={devicesQuery.isLoading}
            emptyIcon={<Cpu className="h-10 w-10" />}
            emptyTitle="Chua co thiet bi"
            emptyAction={{ label: 'Them thiet bi', onClick: () => setCreateOpen(true) }}
          />
        </TabsContent>

        <TabsContent value="cards" className="space-y-0">
          {devicesQuery.isLoading ? (
            <DeviceCardSkeletonGrid />
          ) : (
            <DeviceGrid devices={rows} onOpen={setViewDevice} />
          )}
        </TabsContent>
      </Tabs>

      <DeviceCreateModal open={createOpen} onOpenChange={setCreateOpen} />

      <DeviceEditModal
        open={!!editDevice}
        onOpenChange={(next) => {
          if (!next) {
            setEditDevice(null);
          }
        }}
        device={editDevice}
      />

      <DeviceDetailModalContainer
        device={viewDevice}
        open={!!viewDevice}
        onOpenChange={(next) => {
          if (!next) {
            setViewDevice(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!deleteDevice}
        onCancel={() => setDeleteDevice(null)}
        onConfirm={() => {
          if (!deleteDevice) {
            return;
          }
          deleteMutation.mutate(deleteDevice.id, {
            onSuccess: () => setDeleteDevice(null),
          });
        }}
        title="Xoa thiet bi"
        description={`Ban co chac muon xoa ${deleteDevice?.deviceName ?? ''}?`}
        confirmLabel="Xoa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
};
export default DevicesPage;
