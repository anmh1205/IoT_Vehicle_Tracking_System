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
    <div className="flex w-full flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:justify-end">
      <div className="relative w-full md:min-w-[260px] md:max-w-[360px] md:flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Tìm theo ID hoặc tên thiết bị..."
          value={filters.search ?? ''}
          onChange={(event) => onChange({ ...filters, search: event.target.value.trim() || undefined })}
          className="pl-8"
        />
      </div>

      <Select
        value={filters.status ?? 'all'}
        onValueChange={(value) =>
          onChange({
            ...filters,
            status: value === 'all' ? undefined : value,
          })
        }
      >
        <SelectTrigger className="w-full md:w-[180px]">
          <SelectValue placeholder="Kết nối" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả kết nối</SelectItem>
          <SelectItem value="running">Đang gửi dữ liệu</SelectItem>
          <SelectItem value="online">Còn heartbeat</SelectItem>
          <SelectItem value="stopped">Chậm nhịp</SelectItem>
          <SelectItem value="disconnected">Mất kết nối</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={`${filters.sortBy ?? 'createdAt'}:${filters.sortOrder ?? 'desc'}`}
        onValueChange={(value) => {
          const [sortBy, sortOrder] = value.split(':');
          onChange({
            ...filters,
            sortBy,
            sortOrder: sortOrder as 'asc' | 'desc',
          });
        }}
      >
        <SelectTrigger className="w-full md:w-[220px]">
          <SelectValue placeholder="Sắp xếp" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt:desc">Mới cập nhật</SelectItem>
          <SelectItem value="deviceName:asc">Tên A-Z</SelectItem>
          <SelectItem value="deviceName:desc">Tên Z-A</SelectItem>
          <SelectItem value="currentStatus:asc">Kết nối</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
