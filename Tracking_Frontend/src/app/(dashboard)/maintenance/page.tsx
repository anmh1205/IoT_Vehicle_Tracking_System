'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Eye,
  Edit,
  Trash2,
  Wrench,
  Calendar,
  List,
  ChevronUp,
} from 'lucide-react';
import { useMaintenance, useMaintenanceDetail, useCreateMaintenance, useUpdateMaintenance, useDeleteMaintenance } from '@/hooks/useMaintenance';
import type { Maintenance, CreateMaintenanceInput, MaintenanceListQuery } from '@/types/maintenance.types';
import type { PaginationMeta } from '@/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'tire_rotation', label: 'Tire Rotation' },
  { value: 'brake_service', label: 'Brake Service' },
  { value: 'engine_repair', label: 'Engine Repair' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
] as const;

function maintenanceStatusClasses(status: Maintenance['status']): string {
  switch (status) {
    case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString();
}

function formatCurrency(amount: number | null): string {
  if (amount === null) return '--';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
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

function MaintenanceDetailModal({
  maintenanceId,
  onClose,
}: {
  maintenanceId: number;
  onClose: () => void;
}) {
  const { data: item, isLoading, isError } = useMaintenanceDetail(maintenanceId);
  const deleteMut = useDeleteMaintenance();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteMut.mutateAsync(maintenanceId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl max-h-[85vh] overflow-hidden rounded-lg border border-border bg-card shadow-2xl mx-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-card-foreground truncate">
              {isLoading ? 'Loading...' : item?.title ?? 'Maintenance Detail'}
            </h2>
            {item && (
              <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', maintenanceStatusClasses(item.status))}>
                {item.status.replace('_', ' ')}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          )}
          {isError && <p className="py-8 text-center text-sm text-destructive">Failed to load maintenance details.</p>}
          {item && (
            <div className="space-y-1 divide-y divide-border/50">
              <InfoRow label="Title" value={item.title} />
              <InfoRow label="Type" value={item.maintenanceType} />
              <InfoRow label="Vehicle" value={item.vehicleId} />
              <InfoRow label="Description" value={item.description} />
              <InfoRow label="Scheduled Date" value={formatDate(item.scheduledDate)} />
              <InfoRow label="Completed Date" value={formatDate(item.completedDate)} />
              <InfoRow label="Mileage at Service" value={item.mileageAtService !== null ? `${item.mileageAtService} km` : null} />
              <InfoRow label="Next Service Mileage" value={item.nextServiceMileage !== null ? `${item.nextServiceMileage} km` : null} />
              <InfoRow label="Next Service Date" value={formatDate(item.nextServiceDate)} />
              <InfoRow label="Cost" value={formatCurrency(item.cost)} />
              <InfoRow label="Service Provider" value={item.serviceProvider} />
              <InfoRow label="Notes" value={item.notes} />
              <InfoRow label="Created" value={formatDate(item.createdAt)} />
            </div>
          )}
        </div>

        {item && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMut.isPending}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                confirmDelete
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'text-destructive hover:bg-destructive/10'
              )}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmDelete ? 'Confirm Delete' : 'Delete'}
            </button>
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MaintenanceForm({ onClose }: { onClose: () => void }) {
  const createMut = useCreateMaintenance();
  const [error, setError] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [cost, setCost] = useState('');
  const [serviceProvider, setServiceProvider] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vehicleId.trim() || !maintenanceType.trim() || !title.trim()) {
      setError('Vehicle ID, Type, and Title are required.');
      return;
    }
    try {
      await createMut.mutateAsync({
        vehicleId: vehicleId.trim(),
        maintenanceType: maintenanceType.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledDate: scheduledDate || undefined,
        cost: cost ? Number(cost) : undefined,
        serviceProvider: serviceProvider.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'An error occurred. Please try again.';
      setError(message);
    }
  };

  const inputClass = cn(
    'h-9 w-full rounded-md border border-border bg-background px-3 text-sm',
    'placeholder:text-muted-foreground',
    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
    'transition-colors'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card shadow-2xl mx-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-card-foreground">New Maintenance</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="vehicleId" className="block text-sm font-medium text-foreground mb-1">Vehicle ID</label>
            <input id="vehicleId" type="text" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} placeholder="e.g. VH-001" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="mType" className="block text-sm font-medium text-foreground mb-1">Type</label>
              <input id="mType" type="text" value={maintenanceType} onChange={(e) => setMaintenanceType(e.target.value)} placeholder="e.g. oil_change" className={inputClass} />
            </div>
            <div>
              <label htmlFor="mTitle" className="block text-sm font-medium text-foreground mb-1">Title</label>
              <input id="mTitle" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly Oil Change" className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="mDesc" className="block text-sm font-medium text-foreground mb-1">Description <span className="text-xs text-muted-foreground">(optional)</span></label>
            <textarea id="mDesc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={cn(inputClass, 'h-auto py-2')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="schedDate" className="block text-sm font-medium text-foreground mb-1">Scheduled Date</label>
              <input id="schedDate" type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="mCost" className="block text-sm font-medium text-foreground mb-1">Cost ($)</label>
              <input id="mCost" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="mProvider" className="block text-sm font-medium text-foreground mb-1">Service Provider <span className="text-xs text-muted-foreground">(optional)</span></label>
            <input id="mProvider" type="text" value={serviceProvider} onChange={(e) => setServiceProvider(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="mNotes" className="block text-sm font-medium text-foreground mb-1">Notes <span className="text-xs text-muted-foreground">(optional)</span></label>
            <textarea id="mNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cn(inputClass, 'h-auto py-2')} />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-1.5 text-sm font-medium transition-colors hover:bg-accent">Cancel</button>
            <button
              type="submit"
              disabled={createMut.isPending}
              className={cn(
                'rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors',
                'hover:bg-primary/90',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2',
                createMut.isPending && 'opacity-50 cursor-not-allowed'
              )}
            >
              {createMut.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SimpleCalendar({ items }: { items: Maintenance[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getItemsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return items.filter((item) => item.scheduledDate?.startsWith(dateStr));
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h3 className="text-sm font-semibold text-foreground">{monthName}</h3>
        <button
          type="button"
          onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-accent transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground border-b border-border">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const dayItems = day ? getItemsForDay(day) : [];
          const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

          return (
            <div
              key={idx}
              className={cn(
                'min-h-[80px] border-b border-r border-border/50 p-1',
                !day && 'bg-muted/20'
              )}
            >
              {day && (
                <>
                  <span className={cn(
                    'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-foreground'
                  )}>
                    {day}
                  </span>
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'mt-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium',
                        maintenanceStatusClasses(item.status)
                      )}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const [status, setStatus] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const params: MaintenanceListQuery = {
    page,
    limit: view === 'calendar' ? 100 : 15,
    ...(status && { status }),
    ...(maintenanceType && { maintenanceType }),
  };

  const { data, isLoading, isError } = useMaintenance(params);

  const handleStatusChange = useCallback((v: string) => { setStatus(v); setPage(1); }, []);
  const handleTypeChange = useCallback((v: string) => { setMaintenanceType(v); setPage(1); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Maintenance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule and track vehicle maintenance tasks.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <Dropdown value={status} options={STATUS_OPTIONS} onChange={handleStatusChange} />
          <Dropdown value={maintenanceType} options={TYPE_OPTIONS} onChange={handleTypeChange} />
          <div className="flex items-center rounded-md border border-border">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-l-md transition-colors',
                view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-r-md transition-colors',
                view === 'calendar' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              )}
              aria-label="Calendar view"
            >
              <Calendar className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground',
            'hover:bg-primary/90 transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2'
          )}
        >
          <Plus className="h-4 w-4" /> New Maintenance
        </button>
      </div>

      {/* Content */}
      {view === 'list' ? (
        <div className="rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Vehicle</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Scheduled</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Cost</th>
                  <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
                {!isLoading && isError && (
                  <tr><td colSpan={7} className="py-12 text-center"><p className="text-sm text-destructive">Failed to load maintenance records.</p></td></tr>
                )}
                {!isLoading && !isError && data?.items?.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center">
                    <Wrench className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">No maintenance records found.</p>
                  </td></tr>
                )}
                {!isLoading && data?.items?.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-foreground">{item.title}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground text-xs font-mono">{item.vehicleId ?? '--'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground text-xs">{item.maintenanceType}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{formatDate(item.scheduledDate)}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', maintenanceStatusClasses(item.status))}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{formatCurrency(item.cost)}</td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
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
      ) : (
        <>
          {isLoading && <div className="py-12 text-center text-sm text-muted-foreground">Loading calendar...</div>}
          {isError && <div className="py-12 text-center text-sm text-destructive">Failed to load maintenance records.</div>}
          {!isLoading && !isError && data?.items && <SimpleCalendar items={data.items} />}
        </>
      )}

      {selectedId !== null && (
        <MaintenanceDetailModal maintenanceId={selectedId} onClose={() => setSelectedId(null)} />
      )}
      {showForm && <MaintenanceForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
