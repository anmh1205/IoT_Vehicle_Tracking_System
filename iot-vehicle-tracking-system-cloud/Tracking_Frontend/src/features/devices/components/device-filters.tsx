'use client';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DeviceFilters as DeviceFiltersQuery } from '@/lib/api/devices';
export const DeviceFilters = ({
  filters,
  onChange,
}: {
  filters: DeviceFiltersQuery;
  onChange: (filters: DeviceFiltersQuery) => void;
}) => {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_210px]">
      <div className="relative min-w-0">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo ID hoặc tên thiết bị..."
          value={filters.search ?? ''}
          onChange={(event) =>
            onChange({ ...filters, page: 1, search: event.target.value || undefined })
          }
          className="pl-8"
        />
      </div>

      <Select
        value={filters.status ?? 'all'}
        onValueChange={(value) =>
          onChange({
            ...filters,
            page: 1,
            status: value === 'all' ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả trạng thái</SelectItem>
          <SelectItem value="running">Đang chạy</SelectItem>
          <SelectItem value="stopped">Tạm dừng</SelectItem>
          <SelectItem value="disconnected">Mất kết nối</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={`${filters.sortBy ?? 'createdAt'}:${filters.sortOrder ?? 'desc'}`}
        onValueChange={(value) => {
          const [sortBy, sortOrder] = value.split(':');
          onChange({
            ...filters,
            page: 1,
            sortBy,
            sortOrder: sortOrder as 'asc' | 'desc',
          });
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Sắp xếp" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt:desc">Mới cập nhật</SelectItem>
          <SelectItem value="deviceName:asc">Tên A-Z</SelectItem>
          <SelectItem value="deviceName:desc">Tên Z-A</SelectItem>
          <SelectItem value="currentStatus:asc">Trạng thái</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
