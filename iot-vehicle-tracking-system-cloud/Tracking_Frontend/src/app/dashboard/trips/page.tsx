'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CircleCheckBig, CirclePlay, CircleX, Plus, Route } from 'lucide-react';
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
import { StatCard } from '@/components/common/stat-card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { useRoleAccess } from '@/hooks/use-role-access';

const PAGE_SIZE = 20;
const TRIP_STATUSES = ['planned', 'in_progress', 'completed', 'cancelled'] as const;

type TripStatusFilter = 'all' | (typeof TRIP_STATUSES)[number];

const emptyToNull = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : null;
};

const emptyToUndefined = (value: unknown) => emptyToNull(value) ?? undefined;

const getTripCount = (payload: any) =>
  payload?.pagination?.total ?? payload?.data?.pagination?.total ?? payload?.total;

const TripsPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [previewTripId, setPreviewTripId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TripStatusFilter>('all');
  const deferredSearch = useDeferredValue(search.trim());
  const queryClient = useQueryClient();
  const { canEditDevice, canDeleteDevice } = useRoleAccess();

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
        queryKey: ['trips', 'summary', 'all', deferredSearch],
        queryFn: () =>
          tripServices.getList({
            page: 1,
            limit: 1,
            search: deferredSearch || undefined,
          }),
      },
      ...TRIP_STATUSES.map((item) => ({
        queryKey: ['trips', 'summary', item, deferredSearch],
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
  const [totalQuery, plannedQuery, inProgressQuery, completedQuery, cancelledQuery] = tripStatQueries;
  const statsErrors = tripStatQueries.filter((query) => query.isError);
  const listUnavailable = trips.isLoadingError;
  const listErrorMessage = getApiErrorMessage(trips.error, 'Không thể tải danh sách chuyến đi.');
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <PageContainer
      pageTitle="Chuyến đi"
      pageDescription="Đối chiếu danh sách chuyến đi với dữ liệu thực tế và mở bản đồ phát lại ngay từ bảng."
      pageHeaderAction={canEditDevice ? (
        <Button
          onClick={() => {
            setEditItem(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm chuyến đi
        </Button>
      ) : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Tổng chuyến đi"
          value={getTripCount(totalQuery.data) ?? '—'}
          icon={<Route className="h-4 w-4" />}
          subtitle="Theo từ khóa tìm kiếm hiện tại"
          isLoading={totalQuery.isLoading}
        />
        <StatCard
          title="Đã lên kế hoạch"
          value={getTripCount(plannedQuery.data) ?? '—'}
          icon={<CalendarClock className="h-4 w-4" />}
          isLoading={plannedQuery.isLoading}
        />
        <StatCard
          title="Đang diễn ra"
          value={getTripCount(inProgressQuery.data) ?? '—'}
          icon={<CirclePlay className="h-4 w-4" />}
          isLoading={inProgressQuery.isLoading}
        />
        <StatCard
          title="Hoàn tất"
          value={getTripCount(completedQuery.data) ?? '—'}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={completedQuery.isLoading}
        />
        <StatCard
          title="Đã hủy"
          value={getTripCount(cancelledQuery.data) ?? '—'}
          icon={<CircleX className="h-4 w-4" />}
          isLoading={cancelledQuery.isLoading}
        />
      </div>

      {statsErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Không thể cập nhật đầy đủ số liệu chuyến đi</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              size="sm"
              disabled={statsErrors.some((query) => query.isFetching)}
              onClick={() => {
                for (const query of statsErrors) void query.refetch();
              }}
            >
              Thử lại số liệu
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {trips.isError && !listUnavailable ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{trips.isFetchNextPageError ? 'Không thể tải thêm chuyến đi' : 'Không thể làm mới danh sách chuyến đi'}</AlertTitle>
          <AlertDescription>
            <p>{listErrorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              disabled={trips.isFetching}
              onClick={() => {
                if (trips.isFetchNextPageError) trips.loadMore();
                else void trips.refetch();
              }}
            >
              Thử lại danh sách
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        columns={getTripColumns({
          onPreview: (row) => setPreviewTripId(row.id),
          onEdit: canEditDevice ? (row) => {
            setEditItem(row);
            setOpen(true);
          } : undefined,
          onDelete: canDeleteDevice ? setDeleteItem : undefined,
          onStart: canEditDevice ? (id) => startMutation.mutate(id) : undefined,
          onEnd: canEditDevice ? (id) => endMutation.mutate(id) : undefined,
          startPendingId: startMutation.isPending ? startMutation.variables : undefined,
          endPendingId: endMutation.isPending ? endMutation.variables : undefined,
        })}
        data={tableRows}
        pagination={false}
        isLoading={trips.isLoading}
        onRowClick={(row) => {
          if (!row?.id) return;
          setPreviewTripId(row.id);
        }}
        emptyTitle={listUnavailable ? 'Không thể tải danh sách chuyến đi' : 'Chưa có chuyến đi phù hợp'}
        emptyDescription={listUnavailable ? listErrorMessage : 'Hãy tạo chuyến đi mới hoặc nới bộ lọc để xem lại các hành trình gần đây.'}
        emptyAction={listUnavailable ? {
          label: 'Thử lại danh sách',
          onClick: () => void trips.refetch(),
        } : canEditDevice ? {
          label: 'Thêm chuyến đi',
          onClick: () => {
            setEditItem(null);
            setOpen(true);
          },
        } : undefined}
        toolbar={
          <div className="flex w-full flex-col gap-2 md:flex-row md:items-center md:gap-2 lg:flex-nowrap">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              type="search"
              aria-label="Tìm chuyến đi"
              placeholder="Tìm theo mã chuyến, xe, khách hàng, thiết bị, tài xế hoặc điểm đi/đến..."
              className="w-full md:min-w-[320px] md:max-w-[520px]"
            />
            <Select
              value={status}
              onValueChange={(value: TripStatusFilter) => setStatus(value)}
            >
              <SelectTrigger className="w-full sm:w-[220px]" aria-label="Trạng thái chuyến đi">
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
        autoLoad={!trips.isError}
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
