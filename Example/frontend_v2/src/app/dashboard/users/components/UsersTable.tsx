'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatTimestamp } from '@/lib/utils/date/format';
import { UserDeviceScopeCell } from './UserDeviceScopeCell';

interface UsersTableProps {
  users: User.UserDto[];
  allDevices: Device.DeviceDto[];
  loading: boolean;
  onEdit: (user: User.UserDto) => void;
  onDelete: (user: User.UserDto) => void;
}

export function UsersTable({ users, allDevices, loading, onEdit, onDelete }: UsersTableProps) {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={6} className='py-8 text-center text-sm text-muted-foreground'>
          Đang tải...
        </TableCell>
      </TableRow>
    );
  }

  if (users.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={6} className='py-8 text-center text-sm text-muted-foreground'>
          Không có người dùng phù hợp.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {users.map((u) => (
        <TableRow key={u.id}>
          <TableCell className='font-medium'>{u.username}</TableCell>
          <TableCell>{u.full_name || '—'}</TableCell>
          <TableCell>
            <Badge variant={u.role === 'user' ? 'outline' : 'secondary'}>
              {u.role.toUpperCase()}
            </Badge>
          </TableCell>
          <TableCell>
            <UserDeviceScopeCell user={u} allDevices={allDevices} />
          </TableCell>
          <TableCell className='text-muted-foreground'>
            {u.created_at ? formatTimestamp(u.created_at) : '—'}
          </TableCell>
          <TableCell className='text-right'>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' size='sm' className='h-8' onClick={() => onEdit(u)}>
                Sửa
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='h-8 text-destructive hover:text-destructive'
                onClick={() => onDelete(u)}
              >
                Xóa
              </Button>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

