'use client';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
export interface NotificationFilterState {
  search: string;
  type: 'all' | 'alert' | 'system' | 'export' | 'firmware' | 'geofence';
  readStatus: 'all' | 'read' | 'unread';
  from?: string;
  to?: string;
}
export const NotificationFilters = ({
  value,
  onChange,
}: {
  value: NotificationFilterState;
  onChange: (next: NotificationFilterState) => void;
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
        placeholder="Tìm thông báo..."
        className="min-w-[220px] flex-1 sm:flex-none"
      />

      <Select
        value={value.type}
        onValueChange={(type) =>
          onChange({ ...value, type: type as NotificationFilterState['type'] })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Loại" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả loại</SelectItem>
          <SelectItem value="alert">Cảnh báo</SelectItem>
          <SelectItem value="system">Hệ thống</SelectItem>
          <SelectItem value="export">Xuất dữ liệu</SelectItem>
          <SelectItem value="firmware">Firmware</SelectItem>
          <SelectItem value="geofence">Geofence</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.readStatus}
        onValueChange={(readStatus) =>
          onChange({
            ...value,
            readStatus: readStatus as NotificationFilterState['readStatus'],
          })
        }
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Trạng thái đọc" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="read">Đã đọc</SelectItem>
          <SelectItem value="unread">Chưa đọc</SelectItem>
        </SelectContent>
      </Select>

      <Input
        type="date"
        value={value.from ?? ''}
        onChange={(event) => onChange({ ...value, from: event.target.value || undefined })}
        className="w-[170px]"
      />
      <Input
        type="date"
        value={value.to ?? ''}
        onChange={(event) => onChange({ ...value, to: event.target.value || undefined })}
        className="w-[170px]"
      />
    </div>
  );
};
