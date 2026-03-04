'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleCheckBig, CircleOff, MapPinned, Plus, Radar } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { StatCard } from '@/components/common/stat-card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { geofenceServices } from '@/lib/api/geofences';
import { vehicleServices } from '@/lib/api/vehicles';
import { getGeofenceColumns } from '@/features/geofences/components/geofence-columns';
import { GeofenceForm } from '@/features/geofences/components/geofence-form';
import { GeofenceVehicleBinder } from '@/features/geofences/components/geofence-vehicle-binder';
const GeofencesPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const queryClient = useQueryClient();
  const geofences = useQuery({
    queryKey: ['geofences'],
    queryFn: () => geofenceServices.getList({ limit: 200 }),
  });
  const vehicles = useQuery({
    queryKey: ['vehicles-for-geofence'],
    queryFn: () => vehicleServices.getList({ limit: 200 }),
  });
  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      geofenceServices.create({
        ...payload,
        centerLatitude: Number(payload.centerLatitude),
        centerLongitude: Number(payload.centerLongitude),
        radiusMeters: Number(payload.radiusMeters),
        isActive: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      setOpen(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: any) =>
      geofenceServices.update(id, {
        ...payload,
        centerLatitude: Number(payload.centerLatitude),
        centerLongitude: Number(payload.centerLongitude),
        radiusMeters: Number(payload.radiusMeters),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      setOpen(false);
      setEditItem(null);
    },
  });
  const bindMutation = useMutation({
    mutationFn: ({ id, vehicleIds }: { id: number; vehicleIds: string[] }) =>
      geofenceServices.bindVehicles(
        id,
        vehicleIds.map((item) => Number(item)),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['geofences'] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => geofenceServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofences'] });
      setDeleteItem(null);
    },
  });
  const rows = geofences.data?.items ?? geofences.data?.data?.items ?? [];
  const vehicleRows = vehicles.data?.items ?? vehicles.data?.data?.items ?? [];
  const stats = {
    total: rows.length,
    active: rows.filter((row: any) => !!row.isActive).length,
    inactive: rows.filter((row: any) => !row.isActive).length,
    totalVehiclesBound: rows.reduce((sum: number, row: any) => sum + (row.vehicleIds?.length ?? 0), 0),
  };

  return (
    <PageContainer
      pageTitle="Vùng giám sát"
      pageDescription="Quản lý vùng giám sát"
      pageHeaderAction={
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm vùng giám sát
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng vùng giám sát"
          value={stats.total}
          icon={<MapPinned className="h-4 w-4" />}
          isLoading={geofences.isLoading}
        />
        <StatCard
          title="Đang hoạt động"
          value={stats.active}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={geofences.isLoading}
        />
        <StatCard
          title="Ngưng hoạt động"
          value={stats.inactive}
          icon={<CircleOff className="h-4 w-4" />}
          isLoading={geofences.isLoading}
        />
        <StatCard
          title="Xe đã gán"
          value={stats.totalVehiclesBound}
          icon={<Radar className="h-4 w-4" />}
          isLoading={geofences.isLoading}
        />
      </div>

      <DataTable
        columns={getGeofenceColumns({
          onEdit: (row) => {
            setEditItem(row);
            setOpen(true);
          },
          onDelete: setDeleteItem,
        })}
        data={rows}
        searchKey="name"
        searchPlaceholder="Tìm vùng giám sát..."
        isLoading={geofences.isLoading}
      />

      {editItem && (
        <div className="mt-4 rounded border p-4">
          <div className="mb-2 text-sm font-medium">Gán phương tiện vào vùng giám sát</div>
          <GeofenceVehicleBinder
            vehicles={vehicleRows}
            selected={selectedVehicleIds}
            onChange={setSelectedVehicleIds}
          />
          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              onClick={() =>
                bindMutation.mutate({ id: editItem.id, vehicleIds: selectedVehicleIds })
              }
            >
              Lưu danh sách xe
            </Button>
          </div>
        </div>
      )}

      <GeofenceForm
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditItem(null);
        }}
        defaultValues={editItem ?? undefined}
        onSubmit={(payload) => {
          if (editItem?.id) updateMutation.mutate({ id: editItem.id, payload });
          else createMutation.mutate(payload);
        }}
      />

      <ConfirmDialog
        open={!!deleteItem}
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
