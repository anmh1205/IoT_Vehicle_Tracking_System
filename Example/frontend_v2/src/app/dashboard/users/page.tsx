'use client';

import { useEffect, useMemo, useState } from 'react';
import PageContainer from '@/components/layout/page-container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuthStore } from '@/lib/store/authStore';
import { userServices } from '@/lib/api/users';
import { notificationUtils } from '@/lib/notification';
import { deviceServices } from '@/lib/api/device';
import { useUpdateUserDeviceAccess } from '@/hooks/mutations/useUpdateUserDeviceAccess';
import { UsersStats } from './components/UsersStats';
import { UsersFilters } from './components/UsersFilters';
import { UsersTable } from './components/UsersTable';
import { UserCreateModal } from './components/UserCreateModal';
import { UserEditModal } from './components/UserEditModal';
import { DeleteUserModal } from './components/DeleteUserModal';

type FormState = {
  username: string;
  password: string;
  full_name: string;
  role: User.UserDto['role'];
  deviceAccessMode: 'all' | 'custom';
  deviceIds: string[];
};

export default function UsersPage() {
  const { hasRole, isAuthenticated, hasHydrated } = useAuthStore();
  const [users, setUsers] = useState<User.UserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User.UserDto | null>(null);
  const [deleteUser, setDeleteUser] = useState<User.UserDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allDevices, setAllDevices] = useState<Device.DeviceDto[]>([]);

  const updateDeviceAccessMutation = useUpdateUserDeviceAccess();
  const authorized = hasHydrated && isAuthenticated && hasRole(['admin', 'root']);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userServices.list();
      setUsers(data);
    } catch (e: any) {
      setError(e?.message || 'Lỗi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized) void loadUsers();
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    void (async () => {
      try {
        const devices = await deviceServices.list();
        setAllDevices(devices);
      } catch (e: any) {
        console.error('Failed to load devices for user access config', e);
      }
    })();
  }, [authorized]);

  const filtered = useMemo(() => {
    let list = users;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.username.toLowerCase().includes(s) ||
          (u.full_name || '').toLowerCase().includes(s)
      );
    }
    if (role !== 'all') {
      list = list.filter((u) => u.role === role);
    }
    return list;
  }, [users, search, role]);

  const resetFilters = () => {
    setSearch('');
    setRole('all');
  };

  const handleCreate = async (form: FormState) => {
    try {
      setSubmitting(true);
      if (!form.username || !form.password) {
        notificationUtils.error('Username và mật khẩu là bắt buộc');
        return;
      }
      const created = await userServices.create({
        username: form.username,
        password: form.password,
        full_name: form.full_name,
        role: form.role
      });
      if (created && typeof (created as any).user?.id !== 'undefined') {
        const newUserId = String((created as any).user.id);
        if (form.role === 'user' && form.deviceAccessMode === 'custom' && form.deviceIds.length > 0) {
          await updateDeviceAccessMutation.mutateAsync({
            userId: newUserId,
            mode: 'custom',
            deviceIds: form.deviceIds
          });
        } else {
          await updateDeviceAccessMutation.mutateAsync({
            userId: newUserId,
            mode: 'all'
          });
        }
      }
      notificationUtils.success(`Tạo người dùng "${form.username}" thành công`);
      setCreateOpen(false);
      await loadUsers();
    } catch (e: any) {
      notificationUtils.error(e?.message || 'Lỗi tạo người dùng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (form: FormState) => {
    if (!editUser) return;
    try {
      setSubmitting(true);
      const payload: { full_name?: string; role?: User.UserDto['role']; password?: string } = {};
      if (form.full_name) payload.full_name = form.full_name;
      if (form.role) payload.role = form.role;
      if (form.password) payload.password = form.password;
      await userServices.update(editUser.id, payload);
      try {
        if (form.deviceAccessMode === 'custom' && form.deviceIds.length > 0) {
          await updateDeviceAccessMutation.mutateAsync({
            userId: editUser.id,
            mode: 'custom',
            deviceIds: form.deviceIds
          });
        } else {
          await updateDeviceAccessMutation.mutateAsync({
            userId: editUser.id,
            mode: 'all'
          });
        }
      } catch (e) {
        console.error('Failed to update user device access', e);
      }
      notificationUtils.success('Cập nhật thông tin người dùng thành công');
      setEditUser(null);
      await loadUsers();
    } catch (e: any) {
      notificationUtils.error(e?.message || 'Lỗi cập nhật người dùng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      setSubmitting(true);
      await userServices.delete(deleteUser.id);
      notificationUtils.success('Xóa người dùng thành công');
      setDeleteUser(null);
      await loadUsers();
    } catch (e: any) {
      notificationUtils.error(e?.message || 'Lỗi xóa người dùng');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasHydrated) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center text-slate-500'>
        Đang tải...
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <PageContainer pageTitle='Người dùng' pageDescription='Quản lý tài khoản và phân quyền' scrollable>
      <UsersStats users={users} />

      {error && (
        <Alert variant='destructive' className='mb-4'>
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='space-y-1'>
            <CardTitle>Bảng người dùng</CardTitle>
            <p className='text-sm text-muted-foreground'>
              Danh sách tài khoản, vai trò, phạm vi thiết bị và thời gian tạo.
            </p>
          </div>
          <UsersFilters
            search={search}
            role={role}
            onSearch={setSearch}
            onRole={setRole}
            onReset={resetFilters}
            onAddUser={() => setCreateOpen(true)}
          />
        </CardHeader>
        <CardContent className='p-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[18%]'>Username</TableHead>
                <TableHead className='w-[20%]'>Họ tên</TableHead>
                <TableHead className='w-[15%]'>Vai trò</TableHead>
                <TableHead className='w-[25%]'>Thiết bị được xem</TableHead>
                <TableHead className='w-[15%]'>Tạo lúc</TableHead>
                <TableHead className='w-[7%] text-right'>Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <UsersTable
                users={filtered}
                allDevices={allDevices}
                loading={loading}
                onEdit={setEditUser}
                onDelete={setDeleteUser}
              />
            </TableBody>
          </Table>
        </CardContent>
        <CardContent className='flex items-center justify-between gap-2 text-xs text-muted-foreground'>
          <div>
            Đang hiển thị <span className='font-semibold'>{filtered.length}</span>/{' '}
            <span className='font-semibold'>{users.length}</span> người dùng
          </div>
        </CardContent>
      </Card>

      <UserCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        submitting={submitting}
        allDevices={allDevices}
      />

      <UserEditModal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
        onSubmit={handleUpdate}
        submitting={submitting}
        allDevices={allDevices}
      />

      <DeleteUserModal
        open={!!deleteUser}
        user={deleteUser}
        onConfirm={handleDelete}
        onCancel={() => setDeleteUser(null)}
        submitting={submitting}
      />
    </PageContainer>
  );
}
