'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MAP_STATUS_FILTER_OPTIONS } from '@/features/map/constants/map-config';
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
    <Select value={value} onValueChange={(next) => onChange(next as 'all' | DeviceMapStatus)}>
      <SelectTrigger className={cn('w-full', className)}>
        <SelectValue placeholder="Kết nối" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tất cả kết nối</SelectItem>
        {MAP_STATUS_FILTER_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
