'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { CircleCheckBig, CirclePlay, CircleX, Plus, Route } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
import { tripServices } from '@/lib/api/trips';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { getTripColumns } from '@/features/trips/components/trip-columns';
import { TripForm } from '@/features/trips/components/trip-form';

const PAGE_SIZE = 20;

const TripsPage = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'planned' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();

  const trips = useQuery({
    queryKey: ['trips', page, deferredSearch, status],
    queryFn: () =>
      tripServices.getList({
        page,
        limit: PAGE_SIZE,
        search: deferredSearch || undefined,
        status: status === 'all' ? undefined : status,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      tripServices.create({
        tripCode: payload.tripCode,
        vehicleId: payload.vehicleId || undefined,
        deviceId: payload.deviceId || undefined,
        driverName: payload.driverName || undefined,
        driverPhone: payload.driverPhone || undefined,
        startLocation: payload.startLocation || undefined,
        endLocation: payload.endLocation || undefined,
        plannedStart: payload.plannedStart ? new Date(payload.plannedStart).toISOString() : undefined,
        plannedEnd: payload.plannedEnd ? new Date(payload.plannedEnd).toISOString() : undefined,
        notes: payload.notes || undefined,
      }),
    onSuccess: async () => {
      setPage(1);
      setSearch('');
      setStatus('all');
      await queryClient.invalidateQueries({ queryKey: ['trips'] });
      setOpen(false);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Thêm chuyến đi thất bại',
        getApiErrorMessage(error, 'Không thể thêm chuyến đi.'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: any) =>
      tripServices.update(id, {
        vehicleId: payload.vehicleId || undefined,
        deviceId: payload.deviceId || undefined,
        driverName: payload.driverName || undefined,
        driverPhone: payload.driverPhone || undefined,
        startLocation: payload.startLocation || undefined,
        endLocation: payload.endLocation || undefined,
        plannedStart: payload.plannedStart ? new Date(payload.plannedStart).toISOString() : undefined,
        plannedEnd: payload.plannedEnd ? new Date(payload.plannedEnd).toISOString() : undefined,
        notes: payload.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setOpen(false);
      setEditItem(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Cập nhật chuyến đi thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật chuyến đi.'),
      );
    },
  });

  const startMutation = useMutation({
    mutationFn: (id: number) => tripServices.start(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
    onError: (error: unknown) => {
      notificationUtils.error(
        'Bắt đầu chuyến đi thất bại',
        getApiErrorMessage(error, 'Không thể bắt đầu chuyến đi.'),
      );
    },
  });

  const endMutation = useMutation({
    mutationFn: (id: number) => tripServices.end(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trips'] }),
    onError: (error: unknown) => {
      notificationUtils.error(
        'Kết thúc chuyến đi thất bại',
        getApiErrorMessage(error, 'Không thể kết thúc chuyến đi.'),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tripServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setDeleteItem(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xóa chuyến đi thất bại',
        getApiErrorMessage(error, 'Không thể xóa chuyến đi.'),
      );
    },
  });

  const rows = useMemo(() => trips.data?.items ?? trips.data?.data?.items ?? [], [trips.data]);
  const pagination = trips.data?.pagination ?? trips.data?.data?.pagination;
  const stats = useMemo(
    () => ({
      total: pagination?.total ?? rows.length,
      inProgress: rows.filter((row: any) => row.status === 'in_progress' || row.status === 'started').length,
      completed: rows.filter((row: any) => row.status === 'completed' || row.status === 'ended').length,
      cancelled: rows.filter((row: any) => row.status === 'cancelled').length,
    }),
    [pagination?.total, rows],
  );

  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageContainer
      pageTitle="Chuyến đi"
      pageDescription="Điều phối, theo dõi trạng thái và replay hành trình theo từng chuyến xe"
      pageHeaderAction={
        <Button
          onClick={() => {
            setEditItem(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm chuyến đi
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Tổng chuyến đi" value={stats.total} icon={<Route className="h-4 w-4" />} isLoading={trips.isLoading} />
        <StatCard title="Đang diễn ra trên trang" value={stats.inProgress} icon={<CirclePlay className="h-4 w-4" />} isLoading={trips.isLoading} />
        <StatCard title="Hoàn tất trên trang" value={stats.completed} icon={<CircleCheckBig className="h-4 w-4" />} isLoading={trips.isLoading} />
        <StatCard title="Đã hủy trên trang" value={stats.cancelled} icon={<CircleX className="h-4 w-4" />} isLoading={trips.isLoading} />
      </div>

      <DataTable
        columns={getTripColumns({
          onEdit: (row) => {
            setEditItem(row);
            setOpen(true);
          },
          onDelete: setDeleteItem,
          onStart: (id) => startMutation.mutate(id),
          onEnd: (id) => endMutation.mutate(id),
          startPendingId: startMutation.variables ?? null,
          endPendingId: endMutation.variables ?? null,
        })}
        data={rows}
        pagination={false}
        isLoading={trips.isLoading}
        onRowClick={(row) => {
          if (!row?.id) return;
          router.push(`/dashboard/operations/trips/${row.id}`);
        }}
        emptyTitle="Chưa có chuyến đi phù hợp"
        emptyDescription="Hãy tạo chuyến đi mới hoặc nới bộ lọc để xem lại các hành trình gần đây."
        emptyAction={{
          label: 'Thêm chuyến đi',
          onClick: () => {
            setEditItem(null);
            setOpen(true);
          },
        }}
        toolbar={
          <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:gap-2 lg:flex-nowrap">
            <Input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Tìm theo mã chuyến, mã xe hoặc tài xế..."
              className="w-full md:min-w-[320px] md:max-w-[460px]"
            />
            <Select
              value={status}
              onValueChange={(value: 'all' | 'planned' | 'in_progress' | 'completed' | 'cancelled') => {
                setPage(1);
                setStatus(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="planned">Đã lên kế hoạch</SelectItem>
                <SelectItem value="in_progress">Đang diễn ra</SelectItem>
                <SelectItem value="completed">Hoàn tất</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Trang {pagination?.page ?? page} / {totalPages}. Hiển thị {rows.length} chuyến trên tổng{' '}
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

      <TripForm
        open={open}
        isPending={isSubmitting}
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
        title="Xóa chuyến đi"
        description={`Xóa chuyến đi ${deleteItem?.tripCode ?? ''}?`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
};

export default TripsPage;
