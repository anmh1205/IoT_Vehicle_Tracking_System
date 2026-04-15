'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheckBig, CircleOff, MapPinned, Plus, Radar } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { geofenceServices } from '@/lib/api/geofences';
import { vehicleServices } from '@/lib/api/vehicles';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { getGeofenceColumns } from '@/features/geofences/components/geofence-columns';
import { GeofenceForm } from '@/features/geofences/components/geofence-form';
import { GeofenceVehicleBinder } from '@/features/geofences/components/geofence-vehicle-binder';

const PAGE_SIZE = 20;

const GeofencesPage = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [manageItem, setManageItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [geofenceType, setGeofenceType] = useState<'all' | 'circle' | 'polygon' | 'rectangle'>('all');
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();

  const geofences = useQuery({
    queryKey: ['geofences', page, deferredSearch, status, geofenceType],
    queryFn: () =>
      geofenceServices.getList({
        page,
        limit: PAGE_SIZE,
        search: deferredSearch || undefined,
        isActive: status === 'all' ? undefined : status === 'active',
        geofenceType: geofenceType === 'all' ? undefined : geofenceType,
      }),
  });

  const vehicles = useQuery({
    queryKey: ['vehicles-for-geofence'],
    queryFn: () => vehicleServices.getList({ limit: 100 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      geofenceServices.create({
        ...payload,
        centerLatitude: Number(payload.centerLatitude),
        centerLongitude: Number(payload.centerLongitude),
        radiusMeters: Number(payload.radiusMeters),
        triggerOn: payload.triggerOn,
        description: payload.description || undefined,
      }),
    onSuccess: async () => {
      setPage(1);
      setSearch('');
      setStatus('all');
      setGeofenceType('all');
      await queryClient.invalidateQueries({ queryKey: ['geofences'] });
      setOpen(false);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Thêm vùng giám sát thất bại',
        getApiErrorMessage(error, 'Không thể thêm vùng giám sát.'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: any) =>
      geofenceServices.update(id, {
        ...payload,
        centerLatitude: Number(payload.centerLatitude),
        centerLongitude: Number(payload.centerLongitude),
        radiusMeters: Number(payload.radiusMeters),
        triggerOn: payload.triggerOn,
        description: payload.description || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      setOpen(false);
      setEditItem(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Cập nhật vùng giám sát thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật vùng giám sát.'),
      );
    },
  });

  const syncVehiclesMutation = useMutation({
    mutationFn: async ({ id, nextVehicleIds, currentVehicleIds }: { id: number; nextVehicleIds: string[]; currentVehicleIds: string[] }) => {
      const toAssign = nextVehicleIds.filter((vehicleId) => !currentVehicleIds.includes(vehicleId));
      const toUnassign = currentVehicleIds.filter((vehicleId) => !nextVehicleIds.includes(vehicleId));

      await Promise.all([
        ...toAssign.map((vehicleId) => geofenceServices.assignVehicle(id, vehicleId)),
        ...toUnassign.map((vehicleId) => geofenceServices.unassignVehicle(id, vehicleId)),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      if (manageItem?.id) {
        queryClient.invalidateQueries({ queryKey: ['geofence-detail', manageItem.id] });
      }
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Cập nhật danh sách xe thất bại',
        getApiErrorMessage(error, 'Không thể đồng bộ phương tiện cho vùng giám sát.'),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => geofenceServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      setDeleteItem(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xóa vùng giám sát thất bại',
        getApiErrorMessage(error, 'Không thể xóa vùng giám sát.'),
      );
    },
  });

  const rows = useMemo(() => geofences.data?.items ?? geofences.data?.data?.items ?? [], [geofences.data]);
  const pagination = geofences.data?.pagination ?? geofences.data?.data?.pagination;
  const vehicleRows = vehicles.data?.items ?? vehicles.data?.data?.items ?? [];
  const stats = useMemo(
    () => ({
      total: pagination?.total ?? rows.length,
      active: rows.filter((row: any) => Boolean(row.isActive)).length,
      inactive: rows.filter((row: any) => !row.isActive).length,
      totalVehiclesBound: rows.reduce(
        (sum: number, row: any) => sum + (row.vehicleIds?.length ?? 0),
        0,
      ),
    }),
    [pagination?.total, rows],
  );

  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);

  return (
    <PageContainer
      pageTitle="Vùng giám sát"
      pageDescription="Quản lý geofence, trigger cảnh báo và danh sách phương tiện áp dụng"
      pageHeaderAction={
        <Button
          onClick={() => {
            setEditItem(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm vùng giám sát
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tổng vùng giám sát" value={stats.total} icon={<MapPinned className="h-4 w-4" />} isLoading={geofences.isLoading} />
        <StatCard title="Hoạt động trên trang" value={stats.active} icon={<CircleCheckBig className="h-4 w-4" />} isLoading={geofences.isLoading} />
        <StatCard title="Ngưng hoạt động trên trang" value={stats.inactive} icon={<CircleOff className="h-4 w-4" />} isLoading={geofences.isLoading} />
        <StatCard title="Tổng xe đã gán" value={stats.totalVehiclesBound} icon={<Radar className="h-4 w-4" />} isLoading={geofences.isLoading} />
      </div>

      <DataTable
        columns={getGeofenceColumns({
          onEdit: (row) => {
            setEditItem(row);
            setOpen(true);
          },
          onDelete: setDeleteItem,
          onManageVehicles: (row) => {
            setManageItem(row);
            setSelectedVehicleIds(row.vehicleIds ?? []);
          },
        })}
        data={rows}
        pagination={false}
        isLoading={geofences.isLoading}
        onRowClick={(row: any) => router.push(`/dashboard/geofences/${row.id}`)}
        emptyTitle="Chưa có vùng giám sát phù hợp"
        emptyDescription="Tạo vùng mới để bắt đầu theo dõi các khu vực ra vào quan trọng."
        emptyAction={{
          label: 'Thêm vùng giám sát',
          onClick: () => {
            setEditItem(null);
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
              placeholder="Tìm theo tên hoặc mô tả vùng..."
              className="w-full sm:max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(value: 'all' | 'active' | 'inactive') => {
                setPage(1);
                setStatus(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={geofenceType}
              onValueChange={(value: 'all' | 'circle' | 'polygon' | 'rectangle') => {
                setPage(1);
                setGeofenceType(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Loại vùng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại vùng</SelectItem>
                <SelectItem value="circle">Hình tròn</SelectItem>
                <SelectItem value="polygon">Đa giác</SelectItem>
                <SelectItem value="rectangle">Hình chữ nhật</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Trang {pagination?.page ?? page} / {totalPages}. Hiển thị {rows.length} vùng trên tổng{' '}
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

      {manageItem ? (
        <Card>
          <CardHeader>
            <CardTitle>Quản lý phương tiện trong vùng {manageItem.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <GeofenceVehicleBinder
              vehicles={vehicleRows}
              selected={selectedVehicleIds}
              onChange={setSelectedVehicleIds}
            />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setManageItem(null)}>
                Đóng
              </Button>
              <Button
                disabled={syncVehiclesMutation.isPending}
                onClick={() =>
                  syncVehiclesMutation.mutate({
                    id: manageItem.id,
                    nextVehicleIds: selectedVehicleIds,
                    currentVehicleIds: manageItem.vehicleIds ?? [],
                  })
                }
              >
                Lưu danh sách xe
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <GeofenceForm
        open={open}
        isPending={createMutation.isPending || updateMutation.isPending}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setEditItem(null);
        }}
        defaultValues={editItem ?? undefined}
        onSubmit={(payload) => {
          if (editItem?.id) updateMutation.mutate({ id: editItem.id, payload });
          else createMutation.mutate(payload);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteItem)}
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="Xóa vùng giám sát"
        description={`Xóa vùng giám sát ${deleteItem?.name ?? ''}?`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
};

export default GeofencesPage;
