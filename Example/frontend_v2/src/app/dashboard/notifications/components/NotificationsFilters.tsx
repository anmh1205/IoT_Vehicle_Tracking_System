'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

type LevelFilter = 'all' | 'error' | 'warning' | 'info';

interface NotificationsFiltersProps {
  search: string;
  filter: LevelFilter;
  onSearch: (value: string) => void;
  onFilter: (value: LevelFilter) => void;
  onReset: () => void;
  onMarkAllAsRead: () => void;
  unreadCount: number;
}

export function NotificationsFilters({
  search,
  filter,
  onSearch,
  onFilter,
  onReset,
  onMarkAllAsRead,
  unreadCount
}: NotificationsFiltersProps) {
  return (
    <Card className='mb-4'>
      <CardHeader>
        <CardTitle>Bộ lọc</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center'>
          <div className='relative flex-1 min-w-0'>
            <Input
              placeholder='Tìm theo mã cảnh báo...'
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className='w-full'
            />
          </div>
          <div className='relative w-full sm:w-[160px] shrink-0'>
            <Select value={filter} onValueChange={(val: LevelFilter) => onFilter(val)}>
              <SelectTrigger className='w-full'>
                <SelectValue placeholder='Mức độ' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả mức độ</SelectItem>
                <SelectItem value='error'>Lỗi</SelectItem>
                <SelectItem value='warning'>Cảnh báo</SelectItem>
                <SelectItem value='info'>Thông tin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex gap-2 shrink-0'>
            <Button variant='outline' size='sm' onClick={onReset}>
              <span className='hidden sm:inline'>Đặt lại</span>
              <span className='sm:hidden'>Reset</span>
            </Button>
            <Button variant='outline' size='sm' onClick={onMarkAllAsRead} disabled={!unreadCount}>
              <span className='hidden sm:inline'>Đánh dấu đã đọc hết</span>
              <span className='sm:hidden'>Đã đọc</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

