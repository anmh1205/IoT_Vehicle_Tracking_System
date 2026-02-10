'use client';

import { cn } from '@/lib/utils';
import { DeviceStatusBadge } from './device-status-badge';
import { ChevronLeft, ChevronRight, ArrowUpDown, MapPin } from 'lucide-react';
import type { Device } from '@/types/device.types';
import type { PaginationMeta } from '@/types';

interface DeviceListProps {
  devices: Device[] | undefined;
  pagination: PaginationMeta | undefined;
  isLoading: boolean;
  isError: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
  onSelectDevice: (id: number) => void;
}

function formatRuntime(seconds: number): string {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleString();
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  );
}

const SORTABLE_COLUMNS = [
  { key: 'deviceId', label: 'Device ID' },
  { key: 'deviceName', label: 'Name' },
  { key: 'currentStatus', label: 'Status' },
  { key: 'lastSeenAt', label: 'Last Seen' },
] as const;

export function DeviceList({
  devices,
  pagination,
  isLoading,
  isError,
  sortBy,
  sortOrder,
  onSort,
  onPageChange,
  onSelectDevice,
}: DeviceListProps) {
  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center">
        <p className="text-sm text-destructive">
          Failed to load devices. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              {SORTABLE_COLUMNS.map((col) => (
                <th key={col.key} className="whitespace-nowrap px-3 py-3">
                  <button
                    type="button"
                    onClick={() => onSort(col.key)}
                    className={cn(
                      'inline-flex items-center gap-1 font-medium transition-colors',
                      sortBy === col.key
                        ? 'text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {col.label}
                    <ArrowUpDown className="h-3 w-3" />
                    {sortBy === col.key && (
                      <span className="text-[10px] text-primary">
                        {sortOrder === 'asc' ? '\u2191' : '\u2193'}
                      </span>
                    )}
                  </button>
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">
                Firmware
              </th>
              <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">
                Runtime
              </th>
              <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">
                Location
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

            {!isLoading && devices?.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No devices found. Add your first device to get started.
                  </p>
                </td>
              </tr>
            )}

            {!isLoading &&
              devices?.map((device) => (
                <tr
                  key={device.id}
                  onClick={() => onSelectDevice(device.id)}
                  className={cn(
                    'border-b border-border/50 last:border-0 cursor-pointer',
                    'hover:bg-accent/50 transition-colors'
                  )}
                >
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-foreground">
                    {device.deviceId}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-foreground">
                    {device.deviceName}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <DeviceStatusBadge status={device.currentStatus} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {formatDate(device.lastSeenAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {device.firmwareVersion ?? '--'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {formatRuntime(device.totalRuntimeSeconds)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {device.latitude !== null && device.longitude !== null ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {device.latitude.toFixed(4)}, {device.longitude.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm transition-colors',
                pagination.page <= 1
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:bg-accent'
              )}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm transition-colors',
                pagination.page >= pagination.totalPages
                  ? 'cursor-not-allowed opacity-40'
                  : 'hover:bg-accent'
              )}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
