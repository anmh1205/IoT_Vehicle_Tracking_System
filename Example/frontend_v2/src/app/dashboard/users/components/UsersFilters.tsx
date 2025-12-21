'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface UsersFiltersProps {
  search: string;
  role: string;
  onSearch: (value: string) => void;
  onRole: (value: string) => void;
  onReset: () => void;
  onAddUser: () => void;
}

export function UsersFilters({ search, role, onSearch, onRole, onReset, onAddUser }: UsersFiltersProps) {
  return (
    <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center'>
      <Input
        placeholder='Tìm theo username hoặc họ tên...'
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className='h-10 w-full sm:w-[260px]'
      />
      <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center'>
        <Select value={role} onValueChange={onRole}>
          <SelectTrigger className='h-10 w-full sm:w-[140px]'>
            <SelectValue placeholder='Vai trò' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Tất cả</SelectItem>
            <SelectItem value='root'>Root</SelectItem>
            <SelectItem value='admin'>Admin</SelectItem>
            <SelectItem value='user'>User</SelectItem>
          </SelectContent>
        </Select>
        <div className='flex gap-2 sm:ml-2'>
          <Button type='button' variant='outline' className='h-10 px-3' onClick={onReset}>
            Đặt lại
          </Button>
          <Button type='button' className='h-10 px-3' onClick={onAddUser}>
            Thêm người dùng
          </Button>
        </div>
      </div>
    </div>
  );
}

