'use client';
import { Funnel } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DeviceMapStatus } from '@/features/map/types';
const FILTER_OPTIONS: Array<{
  value: 'all' | DeviceMapStatus;
  label: string;
}> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'running', label: 'Đang chạy' },
  { value: 'stopped', label: 'Đã dừng' },
  { value: 'error', label: 'Lỗi' },
  { value: 'disconnected', label: 'Mất kết nối' },
];
export const DeviceFilterCompact = ({
  value,
  onChange,
}: {
  value: 'all' | DeviceMapStatus;
  onChange: (value: 'all' | DeviceMapStatus) => void;
}) => {
  const label = FILTER_OPTIONS.find((item) => item.value === value)?.label ?? 'Tất cả';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-11">
          <Funnel className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {FILTER_OPTIONS.map((option) => (
          <DropdownMenuItem key={option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
