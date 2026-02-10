'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { DeviceFilters } from '@/lib/api/devices';

export function DeviceFilters({ filters, onChange }: { filters: DeviceFilters; onChange: (filters: DeviceFilters) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Select value={filters.status ?? 'all'} onValueChange={(value) => onChange({ ...filters, status: value === 'all' ? undefined : value })}>
        <SelectTrigger className="w-40"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="running">Đang chạy</SelectItem>
          <SelectItem value="stopped">Dừng</SelectItem>
          <SelectItem value="disconnected">Mất kết nối</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

