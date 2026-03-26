'use client';

import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  onReset,
}: {
  value: NotificationFilterState;
  onChange: (next: NotificationFilterState) => void;
  onReset?: () => void;
}) => {
  return (
    <div className="grid gap-3 rounded-xl border border-border/60 bg-card/70 p-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,0.8fr))_auto]">
      <div className="space-y-1 md:col-span-2 xl:col-span-1">
        <Label htmlFor="notification-search">Tìm thông báo</Label>
        <Input
          id="notification-search"
          value={value.search}
          onChange={(event) => onChange({ ...value, search: event.target.value })}
          placeholder="Tìm theo tiêu đề hoặc nội dung"
        />
      </div>

      <div className="space-y-1">
        <Label>Loại</Label>
        <Select
          value={value.type}
          onValueChange={(type) =>
            onChange({ ...value, type: type as NotificationFilterState['type'] })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Loại thông báo" />
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
      </div>

      <div className="space-y-1">
        <Label>Trạng thái đọc</Label>
        <Select
          value={value.readStatus}
          onValueChange={(readStatus) =>
            onChange({
              ...value,
              readStatus: readStatus as NotificationFilterState['readStatus'],
            })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Trạng thái đọc" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            <SelectItem value="read">Đã đọc</SelectItem>
            <SelectItem value="unread">Chưa đọc</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="notification-from-date">Từ ngày</Label>
        <Input
          id="notification-from-date"
          type="date"
          value={value.from ?? ''}
          onChange={(event) => onChange({ ...value, from: event.target.value || undefined })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="notification-to-date">Đến ngày</Label>
        <Input
          id="notification-to-date"
          type="date"
          value={value.to ?? ''}
          onChange={(event) => onChange({ ...value, to: event.target.value || undefined })}
        />
      </div>

      <div className="flex items-end">
        <Button type="button" variant="outline" className="w-full" onClick={() => onReset?.()}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Đặt lại
        </Button>
      </div>
    </div>
  );
};
