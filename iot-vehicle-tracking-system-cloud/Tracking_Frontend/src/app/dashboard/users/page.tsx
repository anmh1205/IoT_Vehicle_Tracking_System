'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { User } from '@/lib/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, RotateCcwKey, ShieldAlert, ShieldCheck, UserCog, UserMinus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { InfiniteScrollTrigger } from '@/components/common/infinite-scroll-trigger';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { StatCard } from '@/components/common/stat-card';
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
import { userServices, type CreateUserInput, type UpdateUserInput } from '@/lib/api/users';
import { notificationUtils } from '@/lib/notification';
import { getApiErrorMessage } from '@/lib/utils/api-error';
import { useRoleAccess } from '@/hooks/use-role-access';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInfiniteListQuery } from '@/hooks/use-infinite-list-query';

const PAGE_SIZE = 20;

const ROLE_LABELS: Record<string, string> = {
  root: 'Root',
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  operator: 'Điều hành',
  viewer: 'Giám sát',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Hoạt động',
  inactive: 'Ngưng hoạt động',
  suspended: 'Tạm khóa',
};

type UserRole = NonNullable<CreateUserInput['role']>;
type UserStatus = NonNullable<UpdateUserInput['status']>;

type UserFormState = {
  username: string;
  password: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

const EMPTY_FORM: UserFormState = {
  username: '',
  password: '',
  fullName: '',
  email: '',
  role: 'viewer',
  status: 'active',
};

const emptyToNull = (value: unknown) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.length > 0 ? normalized : null;
};

const emptyToUndefined = (value: unknown) => emptyToNull(value) ?? undefined;

const UserForm = ({
  open,
  onOpenChange,
  defaultValues,
  onCreateSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<User> & { status?: UserStatus };
  onCreateSuccess?: () => void;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;

    if (defaultValues?.id) {
      setForm({
        username: defaultValues.username ?? '',
        password: '',
        fullName: defaultValues.fullName ?? '',
        email: defaultValues.email ?? '',
        role: (defaultValues.role as UserRole) ?? 'viewer',
        status: defaultValues.status ?? 'active',
      });
      return;
    }

    setForm(EMPTY_FORM);
  }, [defaultValues, open]);

  const createMutation = useMutation({
    mutationFn: () =>
      userServices.create({
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        role: form.role,
        email: emptyToUndefined(form.email),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      onCreateSuccess?.();
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Thêm người dùng thất bại',
        getApiErrorMessage(error, 'Không thể thêm người dùng.'),
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!defaultValues?.id) {
        throw new Error('Missing user id for update');
      }

      return userServices.update(defaultValues.id, {
        fullName: form.fullName.trim(),
        role: form.role,
        status: form.status,
        email: emptyToNull(form.email),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Cập nhật người dùng thất bại',
        getApiErrorMessage(error, 'Không thể cập nhật người dùng.'),
      );
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isEditing = Boolean(defaultValues?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (isEditing) {
              updateMutation.mutate();
              return;
            }

            createMutation.mutate();
          }}
        >
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Cập nhật người dùng' : 'Thêm người dùng'}</DialogTitle>
          <DialogDescription>
            Quản lý quyền truy cập vận hành, trạng thái tài khoản và thông tin liên hệ nội bộ.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="user-username">Tên đăng nhập</Label>
            <Input
              id="user-username"
              autoComplete="username"
              spellCheck={false}
              placeholder="operator.hcm"
              value={form.username}
              disabled={isEditing}
              onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))}
            />
          </div>

          {!isEditing ? (
            <div className="space-y-2">
              <Label htmlFor="user-password">Mật khẩu ban đầu</Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                placeholder="Tối thiểu 8 ký tự"
                value={form.password}
                onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="user-full-name">Họ và tên</Label>
            <Input
              id="user-full-name"
              autoComplete="name"
              placeholder="Ví dụ: Trần Minh Khang"
              value={form.fullName}
              onChange={(event) => setForm((state) => ({ ...state, fullName: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="member@fleet.vn"
              value={form.email}
              onChange={(event) => setForm((state) => ({ ...state, email: event.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-role">Vai trò</Label>
            <Select
              value={form.role}
              onValueChange={(value: UserRole) => setForm((state) => ({ ...state, role: value }))}
            >
              <SelectTrigger id="user-role">
                <SelectValue placeholder="Chọn vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
                <SelectItem value="operator">{ROLE_LABELS.operator}</SelectItem>
                <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-status">Trạng thái</Label>
            <Select
              value={form.status}
              onValueChange={(value: UserStatus) => setForm((state) => ({ ...state, status: value }))}
            >
              <SelectTrigger id="user-status">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Hoạt động</SelectItem>
                <SelectItem value="inactive">Ngưng hoạt động</SelectItem>
                <SelectItem value="suspended">Tạm khóa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Lưu người dùng
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UsersPage = () => {
  const access = useRoleAccess();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<(User & { status?: UserStatus }) | null>(null);
  const [deleteItem, setDeleteItem] = useState<User | null>(null);
  const [resetPasswordTarget, setResetPasswordTarget] = useState<User | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | 'admin' | 'manager' | 'operator' | 'viewer'>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const deferredSearch = useDeferredValue(search.trim());
  const queryClient = useQueryClient();

  const resetListView = () => {
      setSearch('');
    setRole('all');
    setStatus('all');
  };

  const users = useInfiniteListQuery<User>({
    queryKey: ['users', deferredSearch, role, status],
    pageSize: PAGE_SIZE,
    queryFn: ({ page, limit }) =>
      userServices.getList({
        page,
        limit,
        search: deferredSearch || undefined,
        role: role === 'all' ? undefined : role,
        status: status === 'all' ? undefined : status,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteItem(null);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Xóa người dùng thất bại',
        getApiErrorMessage(error, 'Không thể xóa người dùng.'),
      );
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (id: number) => userServices.resetPassword(id),
    onSuccess: (result) => {
      setTemporaryPassword(result.temporaryPassword);
    },
    onError: (error: unknown) => {
      notificationUtils.error(
        'Reset mật khẩu thất bại',
        getApiErrorMessage(error, 'Không thể reset mật khẩu người dùng.'),
      );
    },
  });

  const rows = users.items;
  const stats = useMemo(
    () => ({
      total: users.total || rows.length,
      admins: rows.filter((row: any) => row.role === 'admin').length,
      suspended: rows.filter((row: any) => row.status === 'suspended').length,
      inactive: rows.filter((row: any) => row.status === 'inactive').length,
    }),
    [users.total, rows],
  );

  if (!access.canManageUsers) {
    return (
      <PageContainer pageTitle="Người dùng" pageDescription="Khu vực hạn chế">
        <Card>
          <CardContent className="flex items-center gap-3 p-4 text-sm">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Bạn không có quyền truy cập phân hệ này.
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'username',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tên đăng nhập" />,
      meta: { label: 'Tên đăng nhập' },
    },
    { accessorKey: 'fullName', header: 'Họ tên', meta: { label: 'Họ tên' } },
    { accessorKey: 'email', header: 'Email', meta: { label: 'Email' } },
    {
      accessorKey: 'role',
      header: 'Vai trò',
      meta: { label: 'Vai trò' },
      cell: ({ row }) => <Badge variant="secondary">{ROLE_LABELS[row.original.role] ?? row.original.role}</Badge>,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      meta: { label: 'Trạng thái' },
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : row.original.status === 'suspended' ? 'destructive' : 'secondary'}>
          {row.original.status ? STATUS_LABELS[row.original.status] ?? row.original.status : '-'}
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
          <Button
            size="sm"
            variant="outline"
            disabled={resetPasswordMutation.isPending}
            onClick={() => setResetPasswordTarget(row.original)}
          >
            Đặt lại mật khẩu
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteItem(row.original)}>
            Xóa
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      pageTitle="Người dùng"
      pageDescription="Quản lý tài khoản hệ thống, vai trò và trạng thái truy cập vận hành"
      pageHeaderAction={
        <Button
          onClick={() => {
            setEditItem(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm người dùng
        </Button>
      }
    >
      {temporaryPassword ? (
        <Card className="border-amber-300 bg-amber-50/80">
          <CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-amber-900">Mật khẩu tạm thời đã được tạo</p>
              <p className="text-amber-900/80">Hãy chuyển ngay cho người dùng qua kênh nội bộ an toàn.</p>
            </div>
            <code className="rounded bg-white px-3 py-2 text-xs font-semibold text-amber-900">
              {temporaryPassword}
            </code>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Tổng tài khoản"
          value={stats.total}
          icon={<UserCog className="h-4 w-4" />}
          isLoading={users.isLoading}
        />
        <StatCard
          title="Quản trị viên đã tải"
          value={stats.admins}
          icon={<ShieldCheck className="h-4 w-4" />}
          isLoading={users.isLoading}
        />
        <StatCard
          title="Tạm khóa đã tải"
          value={stats.suspended}
          icon={<RotateCcwKey className="h-4 w-4" />}
          isLoading={users.isLoading}
        />
        <StatCard
          title="Ngưng hoạt động đã tải"
          value={stats.inactive}
          icon={<UserMinus className="h-4 w-4" />}
          isLoading={users.isLoading}
        />
      </div>

      <DataTable
        columns={columns}
        data={rows}
        pagination={false}
        isLoading={users.isLoading}
        emptyTitle="Chưa có tài khoản phù hợp"
        emptyDescription="Thử nới bộ lọc hoặc thêm người dùng mới để mở quyền vận hành."
        emptyAction={{
          label: 'Thêm người dùng',
          onClick: () => {
            setEditItem(null);
            setOpen(true);
          },
        }}
        toolbar={
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:flex-nowrap">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên đăng nhập, họ tên hoặc email..."
              className="w-full sm:max-w-sm"
            />
            <Select
              value={role}
              onValueChange={(value: 'all' | 'admin' | 'manager' | 'operator' | 'viewer') => setRole(value)}
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả vai trò</SelectItem>
                <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
                <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
                <SelectItem value="operator">{ROLE_LABELS.operator}</SelectItem>
                <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
              </SelectContent>
            </Select>
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
                <SelectItem value="suspended">Tạm khóa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <InfiniteScrollTrigger
        hasMore={users.hasMore}
        isLoadingMore={users.isFetchingNextPage}
        onLoadMore={users.loadMore}
        loadedCount={users.loadedCount}
        totalCount={users.total}
        itemLabel="người dùng"
      />

      <UserForm
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
        title="Xóa người dùng"
        description={`Bạn có chắc muốn xóa tài khoản ${deleteItem?.username ?? ''}?`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={Boolean(resetPasswordTarget)}
        onCancel={() => setResetPasswordTarget(null)}
        onConfirm={() => {
          if (resetPasswordTarget) {
            resetPasswordMutation.mutate(resetPasswordTarget.id, {
              onSettled: () => setResetPasswordTarget(null),
            });
          }
        }}
        title="Đặt lại mật khẩu"
        description={`Bạn có chắc muốn đặt lại mật khẩu cho tài khoản ${resetPasswordTarget?.username ?? ''}? Mật khẩu hiện tại sẽ bị vô hiệu hóa ngay lập tức.`}
        confirmLabel="Đặt lại"
        variant="destructive"
        isPending={resetPasswordMutation.isPending}
      />
    </PageContainer>
  );
};

export default UsersPage;
