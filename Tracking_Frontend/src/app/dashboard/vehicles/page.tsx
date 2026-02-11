'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { vehicleServices } from '@/lib/api/vehicles';
import { getVehicleColumns } from '@/features/vehicles/components/vehicle-columns';
import { VehicleForm } from '@/features/vehicles/components/vehicle-form';
import { VehicleDetailModal } from '@/features/vehicles/components/vehicle-detail-modal';
const VehiclesPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const queryClient = useQueryClient();
  const vehicles = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleServices.getList({ limit: 200 }),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setOpen(false);
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setOpen(false);
      setEditItem(null);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => vehicleServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setDeleteItem(null);
    },
  });
  const rows = vehicles.data?.items ?? vehicles.data?.data?.items ?? [];
  return (
    <PageContainer
      pageTitle="Phương tiện"
      pageDescription="Quản lý danh sách phương tiện"
      pageHeaderAction={
        <Button
          onClick={() => {
            setEditItem(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm phương tiện
        </Button>
      }
    >
      <DataTable
        columns={getVehicleColumns({
          onEdit: (row) => {
            setEditItem(row);
            setOpen(true);
          },
          onDelete: setDeleteItem,
          onDetail: setDetailItem,
        })}
        data={rows}
        searchKey="plateNumber"
        searchPlaceholder="Tìm biển số..."
        isLoading={vehicles.isLoading}
      />

      <VehicleForm
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

      <VehicleDetailModal
        open={!!detailItem}
        onOpenChange={(v) => !v && setDetailItem(null)}
        vehicle={detailItem}
      />

      <ConfirmDialog
        open={!!deleteItem}
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
