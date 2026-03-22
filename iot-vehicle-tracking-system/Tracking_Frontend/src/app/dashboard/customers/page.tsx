'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, Plus, UserRound, UserRoundCheck, UserRoundX } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { StatCard } from '@/components/common/stat-card';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { customerServices } from '@/lib/api/customers';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorDescription, getApiErrorMessage, getApiFieldErrors } from '@/lib/utils/api-error';

const PAGE_SIZE = 20;

const CUSTOMER_TYPE_LABELS: Record<string, string> = {
  individual: 'Cá nhân',
  company: 'Doanh nghiệp',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Hoạt động',
  inactive: 'Ngưng hoạt động',
  suspended: 'Tạm khóa',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
};

const EMPTY_FORM = {
  customerCode: '',
  name: '',
  customerType: 'company',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  taxCode: '',
  notes: '',
  status: 'active',
};

const CustomerForm = ({
  open,
  onOpenChange,
  defaultValues,
  onCreateSuccess,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  defaultValues?: any;
  onCreateSuccess?: () => void;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const isEditing = Boolean(defaultValues?.id);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setFieldErrors({});

    if (!defaultValues) {
      setForm(EMPTY_FORM);
      return;
    }

    setForm({
      customerCode: defaultValues.customerCode ?? '',
      name: defaultValues.name ?? '',
      customerType: defaultValues.customerType ?? 'company',
      contactPerson: defaultValues.contactPerson ?? '',
      phone: defaultValues.phone ?? '',
      email: defaultValues.email ?? '',
      address: defaultValues.address ?? '',
      taxCode: defaultValues.taxCode ?? '',
      notes: defaultValues.notes ?? '',
      status: defaultValues.status ?? 'active',
    });
  }, [defaultValues, open]);

  const createMutation = useMutation({
    mutationFn: () =>
      customerServices.create({
        customerCode: form.customerCode,
        name: form.name,
        customerType: form.customerType,
        contactPerson: form.contactPerson || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        taxCode: form.taxCode || undefined,
        notes: form.notes || undefined,
      }),
    onMutate: () => {
      setFormError(null);
      setFieldErrors({});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      onCreateSuccess?.();
      setFormError(null);
      setFieldErrors({});
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      setFieldErrors(getApiFieldErrors(error));
      setFormError(getApiErrorMessage(error, 'Không thể thêm khách hàng.'));
      notificationUtils.error(
        'Thêm khách hàng thất bại',
        getApiErrorDescription(error) ?? getApiErrorMessage(error, 'Vui lòng kiểm tra lại dữ liệu đã nhập.'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      customerServices.update(defaultValues.id, {
        name: form.name,
        customerType: form.customerType,
        contactPerson: form.contactPerson || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        taxCode: form.taxCode || undefined,
        notes: form.notes || undefined,
        status: form.status,
      }),
    onMutate: () => {
      setFormError(null);
      setFieldErrors({});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setFormError(null);
      setFieldErrors({});
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      setFieldErrors(getApiFieldErrors(error));
      setFormError(getApiErrorMessage(error, 'Không thể cập nhật khách hàng.'));
      notificationUtils.error(
        'Cập nhật khách hàng thất bại',
        getApiErrorDescription(error) ?? getApiErrorMessage(error, 'Vui lòng kiểm tra lại dữ liệu đã nhập.'),
      );
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Cập nhật khách hàng' : 'Thêm khách hàng'}</DialogTitle>
          <DialogDescription>
            Lưu thông tin chủ sở hữu, đơn vị vận hành và đầu mối liên hệ cho đội xe.
          </DialogDescription>
        </DialogHeader>

        {formError ? (
          <p role="alert" aria-live="polite" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customer-code">Mã khách hàng</Label>
            <Input
              id="customer-code"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="Ví dụ: CUS-MINHAN"
              value={form.customerCode}
              disabled={isEditing}
              className={fieldErrors.customerCode ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) =>
                setForm((state) => ({ ...state, customerCode: event.target.value }))
              }
            />
            {fieldErrors.customerCode ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.customerCode}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-type">Loại khách hàng</Label>
            <Select
              value={form.customerType}
              onValueChange={(value) => setForm((state) => ({ ...state, customerType: value }))}
            >
              <SelectTrigger id="customer-type">
                <SelectValue placeholder="Chọn loại khách hàng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company">Doanh nghiệp</SelectItem>
                <SelectItem value="individual">Cá nhân</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer-name">Tên khách hàng</Label>
            <Input
              id="customer-name"
              autoComplete="organization"
              placeholder="Ví dụ: Công ty Vận tải Minh An"
              value={form.name}
              className={fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))}
            />
            {fieldErrors.name ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.name}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-contact">Người liên hệ</Label>
            <Input
              id="customer-contact"
              autoComplete="name"
              placeholder="Ví dụ: Nguyễn Văn A"
              value={form.contactPerson}
              className={fieldErrors.contactPerson ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) =>
                setForm((state) => ({ ...state, contactPerson: event.target.value }))
              }
            />
            {fieldErrors.contactPerson ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.contactPerson}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-phone">Số điện thoại</Label>
            <Input
              id="customer-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0901234567"
              value={form.phone}
              className={fieldErrors.phone ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, phone: event.target.value }))}
            />
            {fieldErrors.phone ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.phone}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-email">Email</Label>
            <Input
              id="customer-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="contact@fleet.vn"
              value={form.email}
              className={fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
            />
            {fieldErrors.email ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.email}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-tax-code">Mã số thuế</Label>
            <Input
              id="customer-tax-code"
              placeholder="Nhập mã số thuế nếu có"
              value={form.taxCode}
              className={fieldErrors.taxCode ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, taxCode: event.target.value }))}
            />
            {fieldErrors.taxCode ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.taxCode}
              </p>
            ) : null}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer-address">Địa chỉ</Label>
            <Input
              id="customer-address"
              autoComplete="street-address"
              placeholder="Ví dụ: 123 Nguyễn Huệ, Quận 1"
              value={form.address}
              className={fieldErrors.address ? 'border-destructive focus-visible:ring-destructive' : undefined}
              onChange={(event) => setForm((state) => ({ ...state, address: event.target.value }))}
            />
            {fieldErrors.address ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.address}
              </p>
            ) : null}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="customer-status">Trạng thái</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((state) => ({ ...state, status: value }))}
              >
                <SelectTrigger id="customer-status">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Hoạt động</SelectItem>
                  <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
                  <SelectItem value="suspended">Tạm khóa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="customer-notes">Ghi chú</Label>
            <Textarea
              id="customer-notes"
              placeholder="Ghi chú về hợp đồng, thời hạn chăm sóc hoặc lưu ý vận hành"
              value={form.notes}
              onChange={(event) => setForm((state) => ({ ...state, notes: event.target.value }))}
            />
            {fieldErrors.notes ? (
              <p role="alert" aria-live="polite" className="text-sm text-destructive">
                {fieldErrors.notes}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            disabled={isPending}
            onClick={() => (isEditing ? updateMutation.mutate() : createMutation.mutate())}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu khách hàng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CustomersPage = () => {
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [customerType, setCustomerType] = useState<'all' | 'individual' | 'company'>('all');
  const deferredSearch = useDeferredValue(search);
  const queryClient = useQueryClient();

  const resetListView = () => {
    setPage(1);
    setSearch('');
    setStatus('all');
    setCustomerType('all');
  };

  const customers = useQuery({
    queryKey: ['customers', page, deferredSearch, status, customerType],
    queryFn: () =>
      customerServices.getList({
        page,
        limit: PAGE_SIZE,
        search: deferredSearch || undefined,
        status: status === 'all' ? undefined : status,
        customerType: customerType === 'all' ? undefined : customerType,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteItem(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xóa khách hàng thất bại',
        getApiErrorMessage(error, 'Không thể xóa khách hàng.'),
      );
    },
  });

  const rows = useMemo(() => customers.data?.items ?? customers.data?.data?.items ?? [], [customers.data]);
  const pagination = customers.data?.pagination ?? customers.data?.data?.pagination;
  const stats = useMemo(
    () => ({
      total: pagination?.total ?? rows.length,
      active: rows.filter((row: any) => row.status === 'active').length,
      inactive: rows.filter((row: any) => row.status === 'inactive' || row.status === 'suspended').length,
      withEmail: rows.filter((row: any) => Boolean(row.email)).length,
    }),
    [pagination?.total, rows],
  );

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: 'customerCode',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Mã khách hàng" />,
      meta: { label: 'Mã khách hàng' },
    },
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tên khách hàng" />,
      meta: { label: 'Tên khách hàng' },
    },
    {
      accessorKey: 'customerType',
      header: 'Loại',
      meta: { label: 'Loại khách hàng' },
      cell: ({ row }) => CUSTOMER_TYPE_LABELS[row.original.customerType] ?? row.original.customerType,
    },
    {
      accessorKey: 'contactPerson',
      header: 'Người liên hệ',
      meta: { label: 'Người liên hệ' },
    },
    { accessorKey: 'phone', header: 'Số điện thoại', meta: { label: 'Số điện thoại' } },
    { accessorKey: 'email', header: 'Email', meta: { label: 'Email' } },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      meta: { label: 'Trạng thái' },
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANTS[row.original.status] ?? 'secondary'}>
          {STATUS_LABELS[row.original.status] ?? row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      meta: { label: 'Thao tác' },
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditItem(row.original);
              setOpen(true);
            }}
          >
            Sửa
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteItem(row.original)}>
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  const totalPages = Math.max(pagination?.totalPages ?? 1, 1);

  return (
    <PageContainer
      pageTitle="Khách hàng"
      pageDescription="Quản lý hồ sơ khách hàng, đầu mối liên hệ và nhóm sở hữu đội xe"
      pageHeaderAction={
        <Button
          onClick={() => {
            setEditItem(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm khách hàng
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng khách hàng"
          value={stats.total}
          icon={<UserRound className="h-4 w-4" />}
          isLoading={customers.isLoading}
        />
        <StatCard
          title="Hoạt động trên trang"
          value={stats.active}
          icon={<UserRoundCheck className="h-4 w-4" />}
          isLoading={customers.isLoading}
        />
        <StatCard
          title="Ngưng hoạt động trên trang"
          value={stats.inactive}
          icon={<UserRoundX className="h-4 w-4" />}
          isLoading={customers.isLoading}
        />
        <StatCard
          title="Có email"
          value={stats.withEmail}
          icon={<Mail className="h-4 w-4" />}
          isLoading={customers.isLoading}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        pagination={false}
        isLoading={customers.isLoading}
        emptyTitle="Chưa có khách hàng phù hợp"
        emptyDescription="Thử nới bộ lọc hoặc thêm hồ sơ khách hàng mới để bắt đầu phân nhóm đội xe."
        emptyAction={{
          label: 'Thêm khách hàng',
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
              placeholder="Tìm theo mã, tên hoặc email khách hàng..."
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
                <SelectItem value="suspended">Tạm khóa</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={customerType}
              onValueChange={(value: 'all' | 'individual' | 'company') => {
                setPage(1);
                setCustomerType(value);
              }}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Loại khách hàng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại khách hàng</SelectItem>
                <SelectItem value="company">Doanh nghiệp</SelectItem>
                <SelectItem value="individual">Cá nhân</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Trang {pagination?.page ?? page} / {totalPages}. Hiển thị {rows.length} hồ sơ trên tổng{' '}
          {pagination?.total ?? rows.length} khách hàng.
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

      <CustomerForm
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) {
            setEditItem(null);
          }
        }}
        defaultValues={editItem ?? undefined}
        onCreateSuccess={resetListView}
      />

      <ConfirmDialog
        open={Boolean(deleteItem)}
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="Xóa khách hàng"
        description={`Bạn có chắc muốn xóa ${deleteItem?.name ?? ''}? Việc này có thể ảnh hưởng các phương tiện liên kết.`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
};

export default CustomersPage;
