'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { DeviceMapStatus } from '@/features/map/types';
export const DeviceFilter = ({
  value,
  onChange,
}: {
  value: 'all' | DeviceMapStatus;
  onChange: (value: 'all' | DeviceMapStatus) => void;
}) => {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as 'all' | DeviceMapStatus)}>
      <SelectTrigger className="w-full">
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
