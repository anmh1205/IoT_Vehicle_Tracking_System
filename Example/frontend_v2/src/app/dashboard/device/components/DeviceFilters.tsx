'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEVICE_SPACING, DEVICE_ANIMATIONS, DEVICE_SHADOWS, DEVICE_HOVER } from './device-design-constants';
import { Search, Filter, ArrowUpDown, Download, Plus, RotateCcw } from 'lucide-react';

type SortBy = 'name' | 'status' | 'runtime';

export function DeviceFilters({
  search,
  status,
  sortBy,
  onSearch,
  onStatus,
  onSort,
  onReset,
  onExport,
  onAdd
}: {
  search: string;
  status: string;
  sortBy: SortBy;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onSort: (value: SortBy) => void;
  onReset: () => void;
  onExport: () => void;
  onAdd: () => void;
}) {
  return (
    <div className='flex w-full flex-col gap-3 sm:flex-row sm:items-center'>
      {/* Search input - flex grow to fill remaining space */}
      <div className='relative flex-1 min-w-0'>
        <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          placeholder='Tìm theo tên hoặc ID...'
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className='w-full pl-9'
        />
      </div>
      {/* Status filter */}
      <div className='relative w-full sm:w-[160px] shrink-0'>
        <Filter className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10' />
        <Select value={status} onValueChange={onStatus}>
          <SelectTrigger className='w-full pl-9'>
            <SelectValue placeholder='Trạng thái' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Tất cả</SelectItem>
            <SelectItem value='running'>Đang chạy</SelectItem>
            <SelectItem value='disconnected'>Mất kết nối</SelectItem>
            <SelectItem value='stopped'>Dừng</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Sort */}
      <div className='relative w-full sm:w-[150px] shrink-0'>
        <ArrowUpDown className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10' />
        <Select value={sortBy} onValueChange={(v: SortBy) => onSort(v)}>
          <SelectTrigger className='w-full pl-9'>
            <SelectValue placeholder='Sắp xếp' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='name'>Tên</SelectItem>
            <SelectItem value='status'>Trạng thái</SelectItem>
            <SelectItem value='runtime'>Thời gian</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {/* Action buttons */}
      <div className='flex gap-2 shrink-0'>
        <Button variant='outline' size='sm' onClick={onExport}>
          <Download className='h-4 w-4 sm:mr-2' />
          <span className='hidden sm:inline'>Xuất</span>
        </Button>
        <Button size='sm' onClick={onAdd}>
          <Plus className='h-4 w-4 sm:mr-2' />
          <span className='hidden sm:inline'>Thêm</span>
        </Button>
      </div>
    </div>
  );
}

