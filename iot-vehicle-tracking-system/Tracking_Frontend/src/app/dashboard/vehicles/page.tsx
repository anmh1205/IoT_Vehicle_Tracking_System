'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CarFront, CircleOff, Plus, Wrench, Zap } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
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
import { deviceServices } from '@/lib/api/devices';
import { vehicleServices } from '@/lib/api/vehicles';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorDescription, getApiErrorMessage, getApiFieldErrors } from '@/lib/utils/api-error';
import { getVehicleColumns } from '@/features/vehicles/components/vehicle-columns';
import { VehicleAssignDevice } from '@/features/vehicles/components/vehicle-assign-device';
import { VehicleForm } from '@/features/vehicles/components/vehicle-form';
import { VehicleDetailModal } from '@/features/vehicles/components/vehicle-detail-modal';

const PAGE_SIZE = 20;

const VehiclesPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [assignItem, setAssignItem] = useState<any | null>(null);
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [vehicleFieldErrors, setVehicleFieldErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'maintenance' | 'inactive' | 'retired'>('all');
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();

  const vehicles = useQuery({
    queryKey: ['vehicles', page, deferredSearch, status],
    queryFn: () =>
      vehicleServices.getList({
        page,
        limit: PAGE_SIZE,
        search: deferredSearch || undefined,
        status: status === 'all' ? undefined : status,
      }),
  });

  const devices = useQuery({
    queryKey: ['devices', 'assignable'],
    queryFn: () => deviceServices.getList({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      vehicleServices.create({
        vehicleId: payload.vehicleId,
        plateNumber: payload.plateNumber,
        brand: payload.brand,
        model: payload.model,
        year: payload.year ? Number(payload.year) : undefined,
      }),
    onMutate: () => {
      setVehicleFormError(null);
      setVehicleFieldErrors({});
    },
    onSuccess: async () => {
      setPage(1);
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
        plateNumber: payload.plateNumber,
        brand: payload.brand,
        model: payload.model,
        year: payload.year ? Number(payload.year) : undefined,
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

  const rows = useMemo(() => vehicles.data?.items ?? vehicles.data?.data?.items ?? [], [vehicles.data]);
  const pagination = vehicles.data?.pagination ?? vehicles.data?.data?.pagination;
  const deviceRows = devices.data?.items ?? [];
  const stats = useMemo(
    () => ({
      total: pagination?.total ?? rows.length,
      active: rows.filter((row: any) => row.status === 'active').length,
      maintenance: rows.filter((row: any) => row.status === 'maintenance').length,
      inactive: rows.filter((row: any) => row.status === 'inactive' || row.status === 'retired').length,
    }),
    [pagination?.total, rows],
  );

  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);

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
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Tìm theo mã xe, biển số hoặc hãng xe..."
              className="w-full sm:max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(value: 'all' | 'active' | 'maintenance' | 'inactive' | 'retired') => {
                setPage(1);
                setStatus(value);
              }}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Trang {pagination?.page ?? page} / {totalPages}. Hiển thị {rows.length} phương tiện trên tổng{' '}
          {pagination?.total ?? rows.length} bản ghi.
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
            Trang trước
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Trang sau
          </Button>
        </div>
      </div>

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
