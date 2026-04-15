'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { AlertTriangle, CircleCheckBig, CircleOff, IdCard, Plus, UserRound } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { driverServices } from '@/lib/api/drivers';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { getDriverColumns } from '@/features/drivers/components/driver-columns';
import { DriverForm } from '@/features/drivers/components/driver-form';
import { DriverDetailModal } from '@/features/drivers/components/driver-detail-modal';

const PAGE_SIZE = 20;

const DriversPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();

  const drivers = useQuery({
    queryKey: ['drivers', page, deferredSearch, status],
    queryFn: () =>
      driverServices.getList({
        page,
        limit: PAGE_SIZE,
        search: deferredSearch || undefined,
        status: status === 'all' ? undefined : status,
      }),
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
    onSuccess: async () => {
      setPage(1);
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

  const rows = useMemo(() => drivers.data?.items ?? drivers.data?.data?.items ?? [], [drivers.data]);
  const pagination = drivers.data?.pagination ?? drivers.data?.data?.pagination;
  const stats = useMemo(
    () => ({
      total: pagination?.total ?? rows.length,
      active: rows.filter((row: any) => row.status === 'active').length,
      inactive: rows.filter((row: any) => row.status === 'inactive').length,
      withLicense: rows.filter((row: any) => Boolean(row.licenseNumber)).length,
    }),
    [pagination?.total, rows],
  );

  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);
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
          title="Hoạt động trên trang"
          value={stats.active}
          icon={<CircleCheckBig className="h-4 w-4" />}
          isLoading={drivers.isLoading}
        />
        <StatCard
          title="Ngưng hoạt động trên trang"
          value={stats.inactive}
          icon={<CircleOff className="h-4 w-4" />}
          isLoading={drivers.isLoading}
        />
        <StatCard
          title="Có GPLX"
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
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Tìm theo mã, tên, số điện thoại hoặc GPLX..."
              className="w-full sm:max-w-sm"
            />
            <Select
              value={status}
              onValueChange={(value: 'all' | 'active' | 'inactive' | 'suspended') => {
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
                <SelectItem value="suspended">Tạm ngưng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Trang {pagination?.page ?? page} / {totalPages}. Hiển thị {rows.length} hồ sơ trên tổng{' '}
          {pagination?.total ?? rows.length} tài xế.
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
