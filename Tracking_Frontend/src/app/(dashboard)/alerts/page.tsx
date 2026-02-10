'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle,
  XCircle,
  Eye,
  Bell,
  MapPin,
} from 'lucide-react';
import { useAlerts, useAlertDetail, useAcknowledgeAlert, useResolveAlert, useDismissAlert } from '@/hooks/useAlerts';
import type { Alert, AlertListQuery } from '@/types/alert.types';
import type { PaginationMeta } from '@/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
] as const;

const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
] as const;

function severityClasses(severity: Alert['severity']): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'low': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  }
}

function statusClasses(status: Alert['status']): string {
  switch (status) {
    case 'active': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    case 'acknowledged': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'resolved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'dismissed': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value ?? '--'}</span>
    </div>
  );
}

function Dropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value)?.label ?? options[0].label;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm',
          'hover:bg-accent transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/30'
        )}
      >
        <span className="text-foreground">{selected}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-card py-1 shadow-lg">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false); }}
                className={cn(
                  'flex w-full items-center px-3 py-1.5 text-sm transition-colors',
                  value === option.value
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
  );
}

function AlertDetailModal({
  alertId,
  onClose,
}: {
  alertId: number;
  onClose: () => void;
}) {
  const { data: alert, isLoading, isError } = useAlertDetail(alertId);
  const acknowledgeMut = useAcknowledgeAlert();
  const resolveMut = useResolveAlert();
  const dismissMut = useDismissAlert();
  const [resolveNotes, setResolveNotes] = useState('');
  const [showResolveInput, setShowResolveInput] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl max-h-[85vh] overflow-hidden rounded-lg border border-border bg-card shadow-2xl mx-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-card-foreground truncate">
            {isLoading ? 'Loading...' : alert?.title ?? 'Alert Detail'}
          </h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          )}
          {isError && <p className="py-8 text-center text-sm text-destructive">Failed to load alert details.</p>}
          {alert && (
            <div className="space-y-1 divide-y divide-border/50">
              <InfoRow label="Title" value={alert.title} />
              <InfoRow label="Type" value={alert.alertType} />
              <InfoRow label="Severity" value={<span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', severityClasses(alert.severity))}>{alert.severity}</span>} />
              <InfoRow label="Status" value={<span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', statusClasses(alert.status))}>{alert.status}</span>} />
              <InfoRow label="Message" value={alert.message} />
              <InfoRow label="Vehicle" value={alert.vehicleId} />
              <InfoRow label="Device" value={alert.deviceId} />
              {alert.latitude !== null && alert.longitude !== null && (
                <InfoRow label="Location" value={`${alert.latitude.toFixed(6)}, ${alert.longitude.toFixed(6)}`} />
              )}
              {alert.speed !== null && <InfoRow label="Speed" value={`${alert.speed} km/h`} />}
              {alert.thresholdValue !== null && <InfoRow label="Threshold" value={alert.thresholdValue} />}
              {alert.actualValue !== null && <InfoRow label="Actual Value" value={alert.actualValue} />}
              <InfoRow label="Created" value={formatDate(alert.createdAt)} />
              {alert.acknowledgedAt && <InfoRow label="Acknowledged At" value={formatDate(alert.acknowledgedAt)} />}
              {alert.resolvedAt && <InfoRow label="Resolved At" value={formatDate(alert.resolvedAt)} />}
              {alert.resolutionNotes && <InfoRow label="Resolution Notes" value={alert.resolutionNotes} />}
            </div>
          )}

          {alert && showResolveInput && (
            <div className="mt-4 space-y-2">
              <label htmlFor="resolveNotes" className="block text-sm font-medium text-foreground">Resolution Notes</label>
              <textarea
                id="resolveNotes"
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
                className={cn(
                  'w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
                  'placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                )}
                placeholder="Describe the resolution..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => { await resolveMut.mutateAsync({ id: alert.id, notes: resolveNotes }); onClose(); }}
                  disabled={resolveMut.isPending}
                  className={cn(
                    'rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white',
                    'hover:bg-emerald-700 transition-colors',
                    resolveMut.isPending && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {resolveMut.isPending ? 'Resolving...' : 'Confirm Resolve'}
                </button>
                <button type="button" onClick={() => setShowResolveInput(false)} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {alert && alert.status === 'active' && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={async () => { await dismissMut.mutateAsync(alert.id); onClose(); }}
              disabled={dismissMut.isPending}
              className={cn('inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent', dismissMut.isPending && 'opacity-50 cursor-not-allowed')}
            >
              <XCircle className="h-3.5 w-3.5" /> Dismiss
            </button>
            <button
              type="button"
              onClick={async () => { await acknowledgeMut.mutateAsync(alert.id); onClose(); }}
              disabled={acknowledgeMut.isPending}
              className={cn('inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700', acknowledgeMut.isPending && 'opacity-50 cursor-not-allowed')}
            >
              <CheckCircle className="h-3.5 w-3.5" /> Acknowledge
            </button>
            <button
              type="button"
              onClick={() => setShowResolveInput(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Resolve
            </button>
          </div>
        )}
        {alert && alert.status === 'acknowledged' && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={() => setShowResolveInput(true)}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Resolve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Pagination({
  pagination,
  onPageChange,
}: {
  pagination: PaginationMeta | undefined;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
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
            pagination.page <= 1 ? 'cursor-not-allowed opacity-40' : 'hover:bg-accent'
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
            pagination.page >= pagination.totalPages ? 'cursor-not-allowed opacity-40' : 'hover:bg-accent'
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [status, setStatus] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);

  const params: AlertListQuery = {
    page,
    limit: 15,
    ...(status && { status }),
    ...(severity && { severity }),
    ...(search && { alertType: search }),
  };

  const { data, isLoading, isError } = useAlerts(params);

  const handleStatusChange = useCallback((v: string) => { setStatus(v); setPage(1); }, []);
  const handleSeverityChange = useCallback((v: string) => { setSeverity(v); setPage(1); }, []);
  const handleSearchChange = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor and manage system alerts and notifications.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by alert type..."
              className={cn(
                'h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                'transition-colors'
              )}
            />
          </div>
          <Dropdown value={status} options={STATUS_OPTIONS} onChange={handleStatusChange} />
          <Dropdown value={severity} options={SEVERITY_OPTIONS} onChange={handleSeverityChange} />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Title</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Type</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Severity</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Status</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Vehicle</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Created</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              {!isLoading && isError && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <p className="text-sm text-destructive">Failed to load alerts. Please try again.</p>
                  </td>
                </tr>
              )}
              {!isLoading && !isError && data?.items?.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Bell className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">No alerts found.</p>
                  </td>
                </tr>
              )}
              {!isLoading && data?.items?.map((alert) => (
                <tr
                  key={alert.id}
                  className="border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-foreground max-w-[200px] truncate">
                    {alert.title}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground text-xs">
                    {alert.alertType}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', severityClasses(alert.severity))}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', statusClasses(alert.status))}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground text-xs font-mono">
                    {alert.vehicleId ?? '--'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {formatDate(alert.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedAlertId(alert.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      <Eye className="h-3 w-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </div>

      {selectedAlertId !== null && (
        <AlertDetailModal alertId={selectedAlertId} onClose={() => setSelectedAlertId(null)} />
      )}
    </div>
  );
}
