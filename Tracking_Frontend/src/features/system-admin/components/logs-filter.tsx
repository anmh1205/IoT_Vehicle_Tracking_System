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
import { LOG_LEVELS } from '@/features/system-admin/constants';
import type { LogsFilterState } from '@/features/system-admin/types';
export const LogsFilter = ({
  value,
  onChange,
}: {
  value: LogsFilterState;
  onChange: (next: LogsFilterState) => void;
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.level}
        onValueChange={(level) =>
          onChange({ ...value, page: 1, level: level as LogsFilterState['level'] })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Log level" />
        </SelectTrigger>
        <SelectContent>
          {LOG_LEVELS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="relative min-w-[220px] flex-1 sm:flex-none">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(event) => onChange({ ...value, page: 1, search: event.target.value })}
          placeholder="Search logs..."
          className="pl-8"
        />
      </div>

      <Input
        type="datetime-local"
        value={value.from ?? ''}
        onChange={(event) => onChange({ ...value, page: 1, from: event.target.value || undefined })}
        className="w-[220px]"
      />
      <Input
        type="datetime-local"
        value={value.to ?? ''}
        onChange={(event) => onChange({ ...value, page: 1, to: event.target.value || undefined })}
        className="w-[220px]"
      />
    </div>
  );
};
