'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
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
import { userServices } from '@/lib/api/users';
import type { ColumnDef } from '@tanstack/react-table';
const ROLE_LABELS: Record<string, string> = {
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
const UserForm = ({
  open,
  onOpenChange,
  defaultValues,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultValues?: any;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
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
    mutationFn: () => userServices.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      onOpenChange(false);
    },
  });
  const updateMutation = useMutation({
    mutationFn: () => userServices.update(defaultValues.id, form),
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
            onValueChange={(value) => setForm((s) => ({ ...s, role: value }))}
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
            onValueChange={(value) => setForm((s) => ({ ...s, status: value }))}
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
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [deleteItem, setDeleteItem] = useState<any | null>(null);
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
  const columns: ColumnDef<any>[] = [
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
      cell: ({ row }) => STATUS_LABELS[row.original.status] ?? row.original.status,
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
