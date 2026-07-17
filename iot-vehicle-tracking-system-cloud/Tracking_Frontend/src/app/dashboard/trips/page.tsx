'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { CalendarClock, CircleCheckBig, CirclePlay, CircleX, Plus, Route } from 'lucide-react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
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
import { tripServices } from '@/lib/api/trips';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { getTripColumns } from '@/features/trips/components/trip-columns';
import { TripForm } from '@/features/trips/components/trip-form';
import { TripPreviewDialog } from '@/features/trips/components/trip-preview-dialog';
import { useInfiniteListQuery } from '@/hooks/use-infinite-list-query';

const PAGE_SIZE = 20;
const TRIP_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;

type TripStatusFilter = 'all' | (typeof TRIP_STATUSES)[number];

const emptyToNull = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : null;
};

const emptyToUndefined = (value: unknown) => emptyToNull(value) ?? undefined;

const getTripCount = (payload: any) =>
  Number(payload?.pagination?.total ?? payload?.data?.pagination?.total ?? payload?.total ?? 0);

const TripsPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [previewTripId, setPreviewTripId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TripStatusFilter>('all');
  const deferredSearch = useDeferredValue(search.trim());
  const queryClient = useQueryClient();

  const trips = useInfiniteListQuery<any>({
    queryKey: ['trips', deferredSearch, status],
    pageSize: PAGE_SIZE,
    queryFn: ({ page, limit }) =>
      tripServices.getList({
        page,
        limit,
        search: deferredSearch || undefined,
        status: status === 'all' ? undefined : status,
      }),
  });

  const tripStatQueries = useQueries({
    queries: [
      {
        queryKey: ['trip-stats', 'all', deferredSearch],
        queryFn: () =>
          tripServices.getList({
            page: 1,
            limit: 1,
            search: deferredSearch || undefined,
          }),
      },
      ...TRIP_STATUSES.map((item) => ({
        queryKey: ['trip-stats', item, deferredSearch],
        queryFn: () =>
          tripServices.getList({
            page: 1,
            limit: 1,
            search: deferredSearch || undefined,
            status: item,
          }),
      })),
    ],
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      tripServices.create({
        tripCode: String(payload.tripCode ?? '').trim(),
        vehicleId: emptyToUndefined(payload.vehicleId),
        deviceId: emptyToUndefined(payload.deviceId),
        driverName: emptyToUndefined(payload.driverName),
        driverPhone: emptyToUndefined(payload.driverPhone),
        startLocation: emptyToUndefined(payload.startLocation),
        endLocation: emptyToUndefined(payload.endLocation),
        plannedStart: payload.plannedStart ? new Date(payload.plannedStart).toISOString() : undefined,
        plannedEnd: payload.plannedEnd ? new Date(payload.plannedEnd).toISOString() : undefined,
        notes: emptyToUndefined(payload.notes),
      }),
    onSuccess: async () => {
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
        vehicleId: emptyToNull(payload.vehicleId),
        deviceId: emptyToNull(payload.deviceId),
        driverName: emptyToNull(payload.driverName),
        driverPhone: emptyToNull(payload.driverPhone),
        startLocation: emptyToNull(payload.startLocation),
        endLocation: emptyToNull(payload.endLocation),
        plannedStart: payload.plannedStart ? new Date(payload.plannedStart).toISOString() : null,
        plannedEnd: payload.plannedEnd ? new Date(payload.plannedEnd).toISOString() : null,
        notes: emptyToNull(payload.notes),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
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
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['trips'] }),
    onError: (error: unknown) => {
      notificationUtils.error(
        'Bắt đầu chuyến đi thất bại',
        getApiErrorMessage(error, 'Không thể bắt đầu chuyến đi.'),
      );
    },
  });

  const endMutation = useMutation({
    mutationFn: (id: number) => tripServices.end(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['trips'] }),
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
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      setDeleteItem(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xóa chuyến đi thất bại',
        getApiErrorMessage(error, 'Không thể xóa chuyến đi.'),
      );
    },
  });

  const rows = trips.items;
  const tableRows = useMemo(
    () =>
      rows.map((row: any) => ({
        ...row,
        vehiclePrimary: row.vehicleId
          ? row.vehiclePlate
            ? `${row.vehiclePlate} - ${row.vehicleId}`
            : row.vehicleId
          : 'Chưa có xe',
        vehicleSecondary: [row.customerName, row.deviceId].filter(Boolean).join(' • '),
        routeLabel: [row.startLocation, row.endLocation].filter(Boolean).join(' -> '),
      })),
    [rows],
  );
  const statsLoading = tripStatQueries.some((query) => query.isLoading);
  const stats = useMemo(
    () => ({
      total: getTripCount(tripStatQueries[0]?.data) || trips.total || rows.length,
      planned: getTripCount(tripStatQueries[1]?.data),
      inProgress: getTripCount(tripStatQueries[2]?.data),
      completed: getTripCount(tripStatQueries[3]?.data),
      cancelled: getTripCount(tripStatQueries[4]?.data),
    }),
    [trips.total, rows.length, tripStatQueries],
  );
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageContainer
      pageTitle="Chuyến đi"
      pageDescription="Đối chiếu danh sách chuyến đi với dữ liệu thực tế và mở bản đồ phát lại ngay từ bảng."
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Tổng chuyến đi"
          value={stats.total}
          icon={<Route className="h-4 w-4" />}
          subtitle="Theo từ khóa tìm kiếm hiện tại"
          isLoading={trips.isLoading || statsLoading}
        />
        <StatCard
          title="Đã lên kế hoạch"
          value={stats.planned}
          icon={<CalendarClock className="h-4 w-4" />}
          isLoading={trips.isLoading || statsLoading}
        />
        <StatCard
          title="Đang diễn ra"
          value={stats.inProgress}
          icon={<CirclePlay className="h-4 w-4" />}
          isLoading={trips.isLoading || statsLoading}
        />
        <StatCard
          title="Hoàn tất"
          value={stats.completed}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={trips.isLoading || statsLoading}
        />
        <StatCard
          title="Đã hủy"
          value={stats.cancelled}
          icon={<CircleX className="h-4 w-4" />}
          isLoading={trips.isLoading || statsLoading}
        />
      </div>

      <DataTable
        columns={getTripColumns({
          onPreview: (row) => setPreviewTripId(row.id),
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
        data={tableRows}
        pagination={false}
        isLoading={trips.isLoading}
        onRowClick={(row) => {
          if (!row?.id) return;
          setPreviewTripId(row.id);
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
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã chuyến, xe, khách hàng, thiết bị, tài xế hoặc điểm đi/đến..."
              className="w-full md:min-w-[320px] md:max-w-[520px]"
            />
            <Select
              value={status}
              onValueChange={(value: TripStatusFilter) => setStatus(value)}
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

      <InfiniteScrollTrigger
        hasMore={trips.hasMore}
        isLoadingMore={trips.isFetchingNextPage}
        onLoadMore={trips.loadMore}
        loadedCount={trips.loadedCount}
        totalCount={trips.total}
        itemLabel="chuyến đi"
      />

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

      <TripPreviewDialog
        open={previewTripId !== null}
        tripId={previewTripId}
        onOpenChange={(value) => {
          if (!value) setPreviewTripId(null);
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
