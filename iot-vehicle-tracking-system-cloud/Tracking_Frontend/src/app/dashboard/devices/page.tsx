'use client';
import { useState } from 'react';
import { AlertTriangle, Cpu, LayoutGrid, Plus, Table2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { getApiErrorMessage } from '@/lib/utils/api-error';
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
  const devicesErrorMessage = devicesQuery.isError
    ? getApiErrorMessage(
        devicesQuery.error,
        'Không thể tải danh sách thiết bị từ máy chủ. Vui lòng thử lại.',
      )
    : null;

  const resetDeviceListView = () => {
    setViewMode('table');
    setFilters({
      page: 1,
      limit: filters.limit ?? 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  return (
    <PageContainer
      pageTitle="Thiết bị"
      pageDescription="Quản lý thiết bị IoT"
      pageHeaderAction={
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm thiết bị
        </Button>
      }
    >
      <MobileDeviceHeader onCreate={() => setCreateOpen(true)} />

      <DeviceStatsBar devices={rows} />

      {devicesErrorMessage ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Không thể đồng bộ dữ liệu thiết bị</AlertTitle>
          <AlertDescription>
            <p>{devicesErrorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                void devicesQuery.refetch();
              }}
              disabled={devicesQuery.isFetching}
            >
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs
        value={viewMode}
        onValueChange={(value) => setViewMode(value as ViewMode)}
        className="space-y-4"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-2">
            <MobileTabSelector />
            <TabsList className="hidden sm:grid sm:grid-cols-2">
              <TabsTrigger value="table">
                <Table2 className="mr-2 h-4 w-4" />
                Bảng dữ liệu
              </TabsTrigger>
              <TabsTrigger value="cards">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Chế độ thẻ
              </TabsTrigger>
            </TabsList>
          </div>
          <div className="min-w-0 lg:flex-1">
            <DeviceFilters filters={filters} onChange={setFilters} />
          </div>
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
            emptyTitle="Chưa có thiết bị"
            emptyAction={{ label: 'Thêm thiết bị', onClick: () => setCreateOpen(true) }}
            onRowClick={setViewDevice}
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

      <DeviceCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreateSuccess={resetDeviceListView}
      />

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
        title="Xóa thiết bị"
        description={`Bạn có chắc muốn xóa ${deleteDevice?.deviceName ?? ''}?`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
};
export default DevicesPage;
