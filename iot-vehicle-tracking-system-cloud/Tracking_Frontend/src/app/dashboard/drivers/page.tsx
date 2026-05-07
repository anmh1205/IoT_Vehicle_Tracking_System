'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { AlertTriangle, CircleCheckBig, CircleOff, IdCard, Plus, UserRound } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { driverServices } from '@/lib/api/drivers';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { getDriverColumns } from '@/features/drivers/components/driver-columns';
import { DriverForm } from '@/features/drivers/components/driver-form';
import { DriverDetailModal } from '@/features/drivers/components/driver-detail-modal';
import { useInfiniteListQuery } from '@/hooks/use-infinite-list-query';

const PAGE_SIZE = 20;

const emptyToNull = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : null;
};

const emptyToUndefined = (value: unknown) => emptyToNull(value) ?? undefined;

const DriversPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const deferredSearch = useDeferredValue(search.trim());
  const queryClient = useQueryClient();

  const drivers = useInfiniteListQuery<any>({
    queryKey: ['drivers', deferredSearch, status],
    pageSize: PAGE_SIZE,
    queryFn: ({ page, limit }) =>
      driverServices.getList({
        page,
        limit,
        search: deferredSearch || undefined,
        status: status === 'all' ? undefined : status,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      driverServices.create({
        driverCode: String(payload.driverCode ?? '').trim(),
        fullName: String(payload.fullName ?? '').trim(),
        phone: emptyToUndefined(payload.phone),
        email: emptyToUndefined(payload.email),
        licenseNumber: emptyToUndefined(payload.licenseNumber),
        licenseType: emptyToUndefined(payload.licenseType),
        licenseExpiry: emptyToUndefined(payload.licenseExpiry),
        dateOfBirth: emptyToUndefined(payload.dateOfBirth),
        address: emptyToUndefined(payload.address),
        status: payload.status || undefined,
        notes: emptyToUndefined(payload.notes),
      }),
    onSuccess: async () => {
      setSearch('');
      setStatus('all');
      await queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setOpen(false);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Thêm tài xế thất bại',
        getApiErrorMessage(error, 'Không thể thêm tài xế.'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: any) =>
      driverServices.update(id, {
        fullName: String(payload.fullName ?? '').trim(),
        phone: emptyToNull(payload.phone),
        email: emptyToNull(payload.email),
        licenseNumber: emptyToNull(payload.licenseNumber),
        licenseType: emptyToNull(payload.licenseType),
        licenseExpiry: emptyToNull(payload.licenseExpiry),
        dateOfBirth: emptyToNull(payload.dateOfBirth),
        address: emptyToNull(payload.address),
        status: payload.status || undefined,
        notes: emptyToNull(payload.notes),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setOpen(false);
      setEditItem(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Cập nhật tài xế thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật tài xế.'),
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => driverServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setDeleteItem(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xóa tài xế thất bại',
        getApiErrorMessage(error, 'Không thể xóa tài xế.'),
      );
    },
  });

  const rows = drivers.items;
  const stats = useMemo(
    () => ({
      total: drivers.total || rows.length,
      active: rows.filter((row: any) => row.status === 'active').length,
      inactive: rows.filter((row: any) => row.status === 'inactive').length,
      withLicense: rows.filter((row: any) => Boolean(row.licenseNumber)).length,
    }),
    [drivers.total, rows],
  );
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const driversErrorMessage = drivers.isError
    ? getApiErrorMessage(
        drivers.error,
        'Không thể tải danh sách tài xế từ máy chủ. Vui lòng thử lại.',
      )
    : null;

  return (
    <PageContainer
      pageTitle="Tài xế"
      pageDescription="Quản lý hồ sơ tài xế và trạng thái vận hành theo từng nhóm lái xe"
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng tài xế"
          value={stats.total}
          icon={<UserRound className="h-4 w-4" />}
          isLoading={drivers.isLoading}
        />
        <StatCard
          title="Hoạt động đã tải"
          value={stats.active}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={drivers.isLoading}
        />
        <StatCard
          title="Ngưng hoạt động đã tải"
          value={stats.inactive}
          icon={<CircleOff className="h-4 w-4" />}
          isLoading={drivers.isLoading}
        />
        <StatCard
          title="Có GPLX đã tải"
          value={stats.withLicense}
          icon={<IdCard className="h-4 w-4" />}
          isLoading={drivers.isLoading}
        />
      </div>

      {driversErrorMessage ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Không thể đồng bộ dữ liệu tài xế</AlertTitle>
          <AlertDescription>
            <p>{driversErrorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                void drivers.refetch();
              }}
              disabled={drivers.isFetching}
            >
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <DataTable
        columns={getDriverColumns({
          onDetail: setDetailItem,
          onEdit: (row) => {
            setEditItem(row);
            setOpen(true);
          },
          onDelete: setDeleteItem,
        })}
        data={rows}
        pagination={false}
        isLoading={drivers.isLoading}
        onRowClick={setDetailItem}
        emptyTitle="Chưa có tài xế phù hợp"
        emptyDescription="Thử nới bộ lọc hoặc thêm hồ sơ tài xế mới để bắt đầu theo dõi."
        emptyAction={{
          label: 'Thêm tài xế',
          onClick: () => {
            setEditItem(null);
            setOpen(true);
          },
        }}
        toolbar={
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo mã, tên, số điện thoại hoặc GPLX..."
              className="w-full sm:max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(value: 'all' | 'active' | 'inactive' | 'suspended') => setStatus(value)}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
                <SelectItem value="suspended">Tạm ngưng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <InfiniteScrollTrigger
        hasMore={drivers.hasMore}
        isLoadingMore={drivers.isFetchingNextPage}
        onLoadMore={drivers.loadMore}
        loadedCount={drivers.loadedCount}
        totalCount={drivers.total}
        itemLabel="tài xế"
      />

      <DriverForm
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

      <DriverDetailModal
        open={Boolean(detailItem)}
        onOpenChange={(value) => !value && setDetailItem(null)}
        driverId={detailItem?.id ?? null}
      />

      <ConfirmDialog
        open={Boolean(deleteItem)}
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="Xóa tài xế"
        description={`Bạn có chắc muốn xóa hồ sơ tài xế ${deleteItem?.fullName ?? ''}?`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
};

export default DriversPage;
