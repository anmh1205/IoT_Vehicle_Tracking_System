'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { driverServices } from '@/lib/api/drivers';
import { getDriverColumns } from '@/features/drivers/components/driver-columns';
import { DriverForm } from '@/features/drivers/components/driver-form';

const DriversPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const drivers = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driverServices.getList({ limit: 200 }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      driverServices.create({
        driverCode: payload.driverCode,
        fullName: payload.fullName,
        phone: payload.phone || undefined,
        email: payload.email || undefined,
        licenseNumber: payload.licenseNumber || undefined,
        licenseType: payload.licenseType || undefined,
        licenseExpiry: payload.licenseExpiry || undefined,
        dateOfBirth: payload.dateOfBirth || undefined,
        address: payload.address || undefined,
        status: payload.status || undefined,
        notes: payload.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: any) =>
      driverServices.update(id, {
        fullName: payload.fullName || undefined,
        phone: payload.phone || undefined,
        email: payload.email || undefined,
        licenseNumber: payload.licenseNumber || undefined,
        licenseType: payload.licenseType || undefined,
        licenseExpiry: payload.licenseExpiry || undefined,
        dateOfBirth: payload.dateOfBirth || undefined,
        address: payload.address || undefined,
        status: payload.status || undefined,
        notes: payload.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setOpen(false);
      setEditItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => driverServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setDeleteItem(null);
    },
  });

  const rows = drivers.data?.items ?? drivers.data?.data?.items ?? [];

  return (
    <PageContainer
      pageTitle="Tài xế"
      pageDescription="Quản lý danh sách tài xế"
      pageHeaderAction={
        <Button
          onClick={() => {
            setEditItem(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm tài xế
        </Button>
      }
    >
      <DataTable
        columns={getDriverColumns({
          onEdit: (row) => {
            setEditItem(row);
            setOpen(true);
          },
          onDelete: setDeleteItem,
        })}
        data={rows}
        searchKey="fullName"
        searchPlaceholder="Tìm tài xế..."
        isLoading={drivers.isLoading}
      />

      <DriverForm
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
        title="Xóa tài xế"
        description={`Bạn có chắc muốn xóa tài xế ${deleteItem?.fullName ?? ''}?`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
};

export default DriversPage;
