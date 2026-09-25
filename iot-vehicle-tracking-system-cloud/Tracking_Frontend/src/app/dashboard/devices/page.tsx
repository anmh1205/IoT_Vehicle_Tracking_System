'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Cpu, LayoutGrid, Plus, Table2 } from 'lucide-react';
import { DataTable } from '@/components/common/data-table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
import { PageContainer } from '@/components/layout/PageContainer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeviceCreateModal } from '@/features/devices/components/device-create-modal';
import { getDeviceColumns } from '@/features/devices/components/device-columns';
import { DeviceDetailModalContainer } from '@/features/devices/components/device-detail-modal/modal-container';
import { DeviceEditModal } from '@/features/devices/components/device-edit-modal';
import { DeviceFilters } from '@/features/devices/components/device-filters';
import { DeviceGrid } from '@/features/devices/components/device-grid';
import { DeviceStatsBar } from '@/features/devices/components/device-stats-bar';
import { DeviceCardSkeletonGrid } from '@/features/devices/components/device-skeletons';
import { useDeleteDevice } from '@/features/devices/hooks/use-delete-device';
import { useDeviceRealtime } from '@/features/devices/hooks/use-device-realtime';
import { useInfiniteDevices } from '@/features/devices/hooks/use-devices';
import type { Device } from '@/features/devices/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { useRoleAccess } from '@/hooks/use-role-access';
import type { DeviceFilters as DeviceFiltersParams } from '@/lib/api/devices';
import { getApiErrorMessage } from '@/lib/utils/api-error';

type ViewMode = 'table' | 'cards';

const DevicesPage = () => {
  const [filters, setFilters] = useState<DeviceFiltersParams>({ limit: 20 });
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [createOpen, setCreateOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [viewDevice, setViewDevice] = useState<Device | null>(null);
  const [deleteDevice, setDeleteDevice] = useState<Device | null>(null);
  const isMobile = useIsMobile();
  const access = useRoleAccess();
  const devicesQuery = useInfiniteDevices(
    {
      search: filters.search,
      status: filters.status,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
    filters.limit ?? 20,
  );
  const deleteMutation = useDeleteDevice();
  const rows = devicesQuery.items;
  const realtimeDeviceIds = useMemo(() => rows.map((device) => device.deviceId), [rows]);

  useDeviceRealtime(realtimeDeviceIds);
  const activeViewMode: ViewMode = isMobile ? 'cards' : viewMode;
  const devicesErrorMessage = devicesQuery.isError
    ? getApiErrorMessage(
        devicesQuery.error,
        'Không thể tải danh sách thiết bị từ máy chủ. Vui lòng thử lại.',
      )
    : null;

  const resetDeviceListView = () => {
    setViewMode('table');
    setFilters({
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
        access.canEditDevice ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm thiết bị
          </Button>
        ) : undefined
      }
    >
      <DeviceStatsBar devices={rows} totalCount={devicesQuery.total} />

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

      <Tabs value={activeViewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          {!isMobile ? (
            <div className="flex items-center gap-2">
              <TabsList className="grid grid-cols-2">
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
          ) : null}
          <div className="min-w-0 lg:flex-1">
            <DeviceFilters filters={filters} onChange={setFilters} />
          </div>
        </div>

        <TabsContent value="table" className="space-y-0">
          <DataTable
            columns={getDeviceColumns({
              onView: setViewDevice,
              onEdit: access.canEditDevice ? setEditDevice : undefined,
              onDelete: access.canDeleteDevice ? setDeleteDevice : undefined,
            })}
            data={rows}
            pagination={false}
            isLoading={devicesQuery.isLoading}
            emptyIcon={<Cpu className="h-10 w-10" />}
            emptyTitle="Chưa có thiết bị"
            emptyAction={
              access.canEditDevice
                ? { label: 'Thêm thiết bị', onClick: () => setCreateOpen(true) }
                : undefined
            }
            onRowClick={setViewDevice}
          />
        </TabsContent>

        <TabsContent value="cards" className="space-y-0">
          {devicesQuery.isLoading ? <DeviceCardSkeletonGrid /> : <DeviceGrid devices={rows} onOpen={setViewDevice} />}
        </TabsContent>
      </Tabs>

      <InfiniteScrollTrigger
        hasMore={devicesQuery.hasMore}
        isLoadingMore={devicesQuery.isFetchingNextPage}
        onLoadMore={devicesQuery.loadMore}
        loadedCount={devicesQuery.loadedCount}
        totalCount={devicesQuery.total}
        itemLabel="thiết bị"
      />

      {access.canEditDevice ? (
        <>
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
        </>
      ) : null}

      <DeviceDetailModalContainer
        device={viewDevice}
        open={!!viewDevice}
        onOpenChange={(next) => {
          if (!next) {
            setViewDevice(null);
          }
        }}
        presentation="workspace"
      />

      {access.canDeleteDevice ? (
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
      ) : null}
    </PageContainer>
  );
};

export default DevicesPage;
