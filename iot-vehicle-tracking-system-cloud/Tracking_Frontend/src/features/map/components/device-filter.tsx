'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DeviceMapStatus } from '@/features/map/types';
import { cn } from '@/lib/utils';
export const DeviceFilter = ({
  value,
  onChange,
  className,
}: {
  value: 'all' | DeviceMapStatus;
  onChange: (value: 'all' | DeviceMapStatus) => void;
  className?: string;
}) => {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as 'all' | DeviceMapStatus)}
    >
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder="Trạng thái" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả trạng thái</SelectItem>
        <SelectItem value="running">Đang chạy</SelectItem>
        <SelectItem value="stopped">Đã dừng</SelectItem>
        <SelectItem value="error">Lỗi</SelectItem>
        <SelectItem value="disconnected">Mất kết nối</SelectItem>
      </SelectContent>
    </Select>
  );
};
