'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CarFront, CircleOff, Plus, Wrench, Zap } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
import { StatCard } from '@/components/common/stat-card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { customerServices } from '@/lib/api/customers';
import { deviceServices } from '@/lib/api/devices';
import { vehicleServices } from '@/lib/api/vehicles';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorDescription, getApiErrorMessage, getApiFieldErrors } from '@/lib/utils/api-error';
import { getVehicleColumns } from '@/features/vehicles/components/vehicle-columns';
import { VehicleAssignDevice } from '@/features/vehicles/components/vehicle-assign-device';
import { VehicleForm } from '@/features/vehicles/components/vehicle-form';
import { VehicleDetailModal } from '@/features/vehicles/components/vehicle-detail-modal';
import { useInfiniteListQuery } from '@/hooks/use-infinite-list-query';

const PAGE_SIZE = 20;

const emptyToNull = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : null;
};

const emptyToUndefined = (value: unknown) => emptyToNull(value) ?? undefined;

const VehiclesPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [assignItem, setAssignItem] = useState<any | null>(null);
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [vehicleFieldErrors, setVehicleFieldErrors] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'maintenance' | 'inactive' | 'retired'>('all');
  const deferredSearch = useDeferredValue(search.trim());
  const queryClient = useQueryClient();

  const vehicles = useInfiniteListQuery<any>({
    queryKey: ['vehicles', deferredSearch, status],
    pageSize: PAGE_SIZE,
    queryFn: ({ page, limit }) =>
      vehicleServices.getList({
        page,
        limit,
        search: deferredSearch || undefined,
        status: status === 'all' ? undefined : status,
      }),
  });

  const devices = useQuery({
    queryKey: ['devices', 'assignable'],
    queryFn: () => deviceServices.getList({ limit: 100 }),
  });

  const customers = useQuery({
    queryKey: ['customers', 'vehicle-form-options'],
    queryFn: () => customerServices.getList({ page: 1, limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      vehicleServices.create({
        vehicleId: String(payload.vehicleId ?? '').trim(),
        plateNumber: emptyToUndefined(payload.plateNumber),
        brand: emptyToUndefined(payload.brand),
        model: emptyToUndefined(payload.model),
        year: String(payload.year ?? '').trim() ? Number(payload.year) : undefined,
        customerId: payload.customerId === 'none' ? undefined : Number(payload.customerId),
      }),
    onMutate: () => {
      setVehicleFormError(null);
      setVehicleFieldErrors({});
    },
    onSuccess: async () => {
      setSearch('');
      setStatus('all');
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setVehicleFormError(null);
      setVehicleFieldErrors({});
      setOpen(false);
    },
    onError: (error: unknown) => {
      setVehicleFieldErrors(getApiFieldErrors(error));
      setVehicleFormError(getApiErrorMessage(error, 'Không thể thêm phương tiện.'));
      notificationUtils.error(
        'Thêm phương tiện thất bại',
        getApiErrorDescription(error) ?? getApiErrorMessage(error, 'Vui lòng kiểm tra lại dữ liệu đã nhập.'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: any) =>
      vehicleServices.update(id, {
        plateNumber: emptyToNull(payload.plateNumber),
        brand: emptyToNull(payload.brand),
        model: emptyToNull(payload.model),
        year: String(payload.year ?? '').trim() ? Number(payload.year) : null,
        customerId: payload.customerId === 'none' ? null : Number(payload.customerId),
      }),
    onMutate: () => {
      setVehicleFormError(null);
      setVehicleFieldErrors({});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setVehicleFormError(null);
      setVehicleFieldErrors({});
      setOpen(false);
      setEditItem(null);
    },
    onError: (error: unknown) => {
      setVehicleFieldErrors(getApiFieldErrors(error));
      setVehicleFormError(getApiErrorMessage(error, 'Không thể cập nhật phương tiện.'));
      notificationUtils.error(
        'Cập nhật phương tiện thất bại',
        getApiErrorDescription(error) ?? getApiErrorMessage(error, 'Vui lòng kiểm tra lại dữ liệu đã nhập.'),
      );
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, deviceId }: { id: number; deviceId: string | null }) =>
      vehicleServices.assignDevice(id, deviceId),
    onSuccess: (updatedVehicle) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setAssignItem(null);
      setDetailItem((current: any) => (current?.id === updatedVehicle?.id ? updatedVehicle : current));
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Gán thiết bị thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật thiết bị gán cho phương tiện.'),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vehicleServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteItem(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xóa phương tiện thất bại',
        getApiErrorMessage(error, 'Không thể xóa phương tiện.'),
      );
    },
  });

  const rows = vehicles.items;
  const deviceRows = devices.data?.items ?? [];
  const customerRows = customers.data?.items ?? customers.data?.data?.items ?? [];
  const stats = useMemo(
    () => ({
      total: vehicles.total || rows.length,
      active: rows.filter((row: any) => row.status === 'active').length,
      maintenance: rows.filter((row: any) => row.status === 'maintenance').length,
      inactive: rows.filter((row: any) => row.status === 'inactive' || row.status === 'retired').length,
    }),
    [vehicles.total, rows],
  );
  const vehiclesErrorMessage = vehicles.isError
    ? getApiErrorMessage(
        vehicles.error,
        'Không thể tải danh sách phương tiện từ máy chủ. Vui lòng thử lại.',
      )
    : null;

  return (
    <PageContainer
      pageTitle="Phương tiện"
      pageDescription="Quản lý danh sách phương tiện, trạng thái vận hành và thiết bị telemetry đang gắn"
      pageHeaderAction={
        <Button
          onClick={() => {
            setEditItem(null);
            setVehicleFormError(null);
            setVehicleFieldErrors({});
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm phương tiện
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tổng phương tiện" value={stats.total} icon={<CarFront className="h-4 w-4" />} isLoading={vehicles.isLoading} />
        <StatCard title="Đang hoạt động trên trang" value={stats.active} icon={<Zap className="h-4 w-4" />} isLoading={vehicles.isLoading} />
        <StatCard title="Đang bảo trì trên trang" value={stats.maintenance} icon={<Wrench className="h-4 w-4" />} isLoading={vehicles.isLoading} />
        <StatCard title="Ngưng hoạt động trên trang" value={stats.inactive} icon={<CircleOff className="h-4 w-4" />} isLoading={vehicles.isLoading} />
      </div>

      {vehiclesErrorMessage ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Không thể đồng bộ dữ liệu phương tiện</AlertTitle>
          <AlertDescription>
            <p>{vehiclesErrorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                void vehicles.refetch();
              }}
              disabled={vehicles.isFetching}
            >
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        columns={getVehicleColumns({
          onEdit: (row) => {
            setEditItem(row);
            setVehicleFormError(null);
            setVehicleFieldErrors({});
            setOpen(true);
          },
          onDelete: setDeleteItem,
          onDetail: setDetailItem,
          onAssign: setAssignItem,
        })}
        data={rows}
        pagination={false}
        isLoading={vehicles.isLoading}
        onRowClick={setDetailItem}
        emptyTitle="Chưa có phương tiện phù hợp"
        emptyDescription="Thử nới bộ lọc hoặc thêm phương tiện mới để bắt đầu ghép thiết bị telemetry."
        emptyAction={{
          label: 'Thêm phương tiện',
          onClick: () => {
            setEditItem(null);
            setVehicleFormError(null);
            setVehicleFieldErrors({});
            setOpen(true);
          },
        }}
        toolbar={
          <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:gap-2 lg:flex-nowrap">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã xe, biển số hoặc hãng xe..."
              className="w-full md:min-w-[320px] md:max-w-[460px]"
            />
            <Select
              value={status}
              onValueChange={(value: 'all' | 'active' | 'maintenance' | 'inactive' | 'retired') => setStatus(value)}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Đang hoạt động</SelectItem>
                <SelectItem value="maintenance">Đang bảo trì</SelectItem>
                <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
                <SelectItem value="retired">Ngưng khai thác</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <InfiniteScrollTrigger
        hasMore={vehicles.hasMore}
        isLoadingMore={vehicles.isFetchingNextPage}
        onLoadMore={vehicles.loadMore}
        loadedCount={vehicles.loadedCount}
        totalCount={vehicles.total}
        itemLabel="phương tiện"
      />

      <VehicleForm
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) {
            setEditItem(null);
            setVehicleFormError(null);
            setVehicleFieldErrors({});
          }
        }}
        defaultValues={editItem ?? undefined}
        customers={customerRows}
        formError={vehicleFormError}
        fieldErrors={vehicleFieldErrors}
        onSubmit={(payload) => {
          if (editItem?.id) updateMutation.mutate({ id: editItem.id, payload });
          else createMutation.mutate(payload);
        }}
      />

      <VehicleAssignDevice
        open={Boolean(assignItem)}
        onOpenChange={(value) => !value && setAssignItem(null)}
        devices={deviceRows}
        currentDeviceId={assignItem?.deviceId ?? null}
        isPending={assignMutation.isPending}
        onAssign={(deviceId) => {
          if (!assignItem?.id) return;
          assignMutation.mutate({ id: assignItem.id, deviceId });
        }}
      />

      <VehicleDetailModal
        open={Boolean(detailItem)}
        onOpenChange={(value) => !value && setDetailItem(null)}
        vehicle={detailItem}
      />

      <ConfirmDialog
        open={Boolean(deleteItem)}
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="Xóa phương tiện"
        description={`Bạn có chắc muốn xóa ${deleteItem?.plateNumber ?? ''}?`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
};

export default VehiclesPage;
