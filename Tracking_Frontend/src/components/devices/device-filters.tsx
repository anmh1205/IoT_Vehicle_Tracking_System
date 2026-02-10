'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, Plus, ChevronDown } from 'lucide-react';

interface DeviceFiltersProps {
  search: string;
  status: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onAddDevice: () => void;
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'running', label: 'Running' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'disconnected', label: 'Disconnected' },
] as const;

export function DeviceFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
  onAddDevice,
}: DeviceFiltersProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const selectedLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'All Statuses';

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by ID or name..."
            className={cn(
              'h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm',
              'placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
              'transition-colors'
            )}
          />
        </div>

        {/* Status dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusOpen((v) => !v)}
            className={cn(
              'flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm',
              'hover:bg-accent transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/30'
            )}
          >
            <span className="text-foreground">{selectedLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {statusOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setStatusOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-card py-1 shadow-lg">
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onStatusChange(option.value);
                      setStatusOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center px-3 py-1.5 text-sm transition-colors',
                      status === option.value
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-accent'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add Device button */}
      <button
        type="button"
        onClick={onAddDevice}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground',
          'hover:bg-primary/90 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2'
        )}
      >
        <Plus className="h-4 w-4" />
        Add Device
      </button>
    </div>
  );
}
