'use client';
import { useEffect, useState } from 'react';
import type { User } from '@/lib/stores/auth-store';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, ShieldAlert } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { DataTable } from '@/components/common/data-table';
import { DataTableColumnHeader } from '@/components/common/data-table-column-header';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  userServices,
  type CreateUserInput,
  type UpdateUserInput,
} from '@/lib/api/users';
import { useRoleAccess } from '@/hooks/use-role-access';
import { Card, CardContent } from '@/components/ui/card';
import type { ColumnDef } from '@tanstack/react-table';
const ROLE_LABELS: Record<User['role'], string> = {
  root: 'Root',
  admin: 'Quản trị viên',
  manager: 'Quản lý',
  operator: 'Điều hành',
  viewer: 'Giám sát',
};
const STATUS_LABELS: Record<string, string> = {
  active: 'Đang hoạt động',
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

const UserForm = ({
  open,
  onOpenChange,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: Partial<User> & { status?: UserStatus };
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UserFormState>({
    username: '',
    password: '',
    fullName: '',
    email: '',
    role: 'viewer',
    status: 'active',
  });
  useEffect(() => {
    if (!open) return;
    if (defaultValues?.id) {
      setForm({
        username: defaultValues.username ?? '',
        password: '',
        fullName: defaultValues.fullName ?? '',
        email: defaultValues.email ?? '',
        role: defaultValues.role ?? 'viewer',
        status: defaultValues.status ?? 'active',
      });
      return;
    }
    setForm({
      username: '',
      password: '',
      fullName: '',
      email: '',
      role: 'viewer',
      status: 'active',
    });
  }, [defaultValues, open]);
  const createMutation = useMutation({
    mutationFn: () =>
      userServices.create({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        role: form.role,
        email: form.email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: () => {
      if (!defaultValues?.id) {
        throw new Error('Missing user id for update');
      }
      return userServices.update(defaultValues.id, {
        fullName: form.fullName,
        role: form.role,
        status: form.status,
        email: form.email || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{defaultValues?.id ? 'Cập nhật người dùng' : 'Thêm người dùng'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Tên đăng nhập"
            value={form.username}
            onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))}
            disabled={!!defaultValues?.id}
          />
          {!defaultValues?.id && (
            <Input
              type="password"
              placeholder="Mật khẩu"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            />
          )}
          <Input
            placeholder="Họ tên"
            value={form.fullName}
            onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
          />
          <Input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          />
          <Select
            value={form.role}
            onValueChange={(value: UserRole) => setForm((s) => ({ ...s, role: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn vai trò" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">{ROLE_LABELS.admin}</SelectItem>
              <SelectItem value="manager">{ROLE_LABELS.manager}</SelectItem>
              <SelectItem value="operator">{ROLE_LABELS.operator}</SelectItem>
              <SelectItem value="viewer">{ROLE_LABELS.viewer}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={form.status}
            onValueChange={(value: UserStatus) => setForm((s) => ({ ...s, status: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{STATUS_LABELS.active}</SelectItem>
              <SelectItem value="inactive">{STATUS_LABELS.inactive}</SelectItem>
              <SelectItem value="suspended">{STATUS_LABELS.suspended}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            onClick={() => (defaultValues?.id ? updateMutation.mutate() : createMutation.mutate())}
          >
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
const UsersPage = () => {
  const access = useRoleAccess();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<(User & { status?: UserStatus }) | null>(null);
  const [deleteItem, setDeleteItem] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => userServices.getList({ limit: 200 }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => userServices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setDeleteItem(null);
    },
  });
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'username',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tên đăng nhập" />,
    },
    { accessorKey: 'fullName', header: 'Họ tên' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role',
      header: 'Vai trò',
      cell: ({ row }) => ROLE_LABELS[row.original.role] ?? row.original.role,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) =>
        row.original.status ? STATUS_LABELS[row.original.status] ?? row.original.status : '-',
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-1">
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
  const rows = users.data ?? [];

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

  return (
    <PageContainer
      pageTitle="Người dùng"
      pageDescription="Quản lý tài khoản hệ thống"
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
      <DataTable
        columns={columns}
        data={rows}
        searchKey="username"
        searchPlaceholder="Tìm người dùng..."
        isLoading={users.isLoading}
      />
      <UserForm open={open} onOpenChange={setOpen} defaultValues={editItem ?? undefined} />
      <ConfirmDialog
        open={!!deleteItem}
        onCancel={() => setDeleteItem(null)}
        onConfirm={() => deleteItem && deleteMutation.mutate(deleteItem.id)}
        title="Xóa người dùng"
        description={`Bạn có chắc muốn xóa ${deleteItem?.username ?? ''}?`}
        confirmLabel="Xóa"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </PageContainer>
  );
};
export default UsersPage;
