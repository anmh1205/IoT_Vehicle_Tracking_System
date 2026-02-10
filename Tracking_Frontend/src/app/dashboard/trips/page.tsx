'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Button } from '@/components/ui/button';
import { tripServices } from '@/lib/api/trips';
import { getTripColumns } from '@/features/trips/components/trip-columns';
import { TripForm } from '@/features/trips/components/trip-form';

export default function TripsPage() {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const queryClient = useQueryClient();

  const trips = useQuery({ queryKey: ['trips'], queryFn: () => tripServices.getList({ limit: 200 }) });
  const createMutation = useMutation({ mutationFn: (payload: any) => tripServices.create(payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); setOpen(false); } });
  const updateMutation = useMutation({ mutationFn: ({ id, payload }: any) => tripServices.update(id, payload), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); setOpen(false); setEditItem(null); } });
  const startMutation = useMutation({ mutationFn: (id: number) => tripServices.start(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }) });
  const endMutation = useMutation({ mutationFn: (id: number) => tripServices.end(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }) });
  const deleteMutation = useMutation({ mutationFn: (id: number) => tripServices.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['trips'] }); setDeleteItem(null); } });

  const rows = trips.data?.items ?? trips.data?.data?.items ?? [];

  return (
    <PageContainer pageTitle="Chuyến đi" pageDescription="Quản lý chuyến đi" pageHeaderAction={<Button onClick={() => { setEditItem(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Thêm chuyến đi</Button>}>
      <DataTable columns={getTripColumns({ onEdit: (row) => { setEditItem(row); setOpen(true); }, onDelete: setDeleteItem, onStart: (id) => startMutation.mutate(id), onEnd: (id) => endMutation.mutate(id) })} data={rows} searchKey="tripCode" searchPlaceholder="Tìm chuyến đi..." isLoading={trips.isLoading} />

      <TripForm
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setEditItem(null); }}
        defaultValues={editItem ?? undefined}
        onSubmit={(payload) => {
          if (editItem?.id) updateMutation.mutate({ id: editItem.id, payload });
          else createMutation.mutate(payload);
        }}
      />

      <ConfirmDialog open={!!deleteItem} onCancel={() => setDeleteItem(null)} onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)} title="Xóa chuyến đi" description={`Xóa chuyến đi ${deleteItem?.tripCode ?? ''}?`} confirmLabel="Xóa" variant="destructive" isPending={deleteMutation.isPending} />
    </PageContainer>
  );
}


