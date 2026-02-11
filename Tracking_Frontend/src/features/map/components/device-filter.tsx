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
        <SelectValue placeholder="Status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All status</SelectItem>
        <SelectItem value="running">Running</SelectItem>
        <SelectItem value="stopped">Stopped</SelectItem>
        <SelectItem value="error">Error</SelectItem>
        <SelectItem value="disconnected">Disconnected</SelectItem>
      </SelectContent>
    </Select>
  );
};
