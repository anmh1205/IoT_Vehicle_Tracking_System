'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Play,
  Square,
  Eye,
  Route,
} from 'lucide-react';
import { useTrips, useTripDetail, useCreateTrip, useStartTrip, useEndTrip } from '@/hooks/useTrips';
import type { Trip, CreateTripInput, TripListQuery } from '@/types/trip.types';
import type { PaginationMeta } from '@/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
] as const;

function tripStatusClasses(status: Trip['status']): string {
  switch (status) {
    case 'planned': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'completed': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString();
}

function SkeletonRow() {
  return (
    <tr className="border-b border-border/50">
      {Array.from({ length: 8 }).map((_, i) => (
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

function TripDetailModal({
  tripId,
  onClose,
}: {
  tripId: number;
  onClose: () => void;
}) {
  const { data: trip, isLoading, isError } = useTripDetail(tripId);
  const startMut = useStartTrip();
  const endMut = useEndTrip();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl max-h-[85vh] overflow-hidden rounded-lg border border-border bg-card shadow-2xl mx-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-card-foreground truncate">
              {isLoading ? 'Loading...' : trip?.tripCode ?? 'Trip Detail'}
            </h2>
            {trip && (
              <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', tripStatusClasses(trip.status))}>
                {trip.status.replace('_', ' ')}
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
          {isError && <p className="py-8 text-center text-sm text-destructive">Failed to load trip details.</p>}
          {trip && (
            <div className="space-y-1 divide-y divide-border/50">
              <InfoRow label="Trip Code" value={<code className="font-mono text-xs">{trip.tripCode}</code>} />
              <InfoRow label="Vehicle" value={trip.vehicleId} />
              <InfoRow label="Device" value={trip.deviceId} />
              <InfoRow label="Driver" value={trip.driverName} />
              <InfoRow label="Driver Phone" value={trip.driverPhone} />
              <InfoRow label="Start Location" value={trip.startLocation} />
              <InfoRow label="End Location" value={trip.endLocation} />
              <InfoRow label="Planned Start" value={formatDate(trip.plannedStart)} />
              <InfoRow label="Planned End" value={formatDate(trip.plannedEnd)} />
              <InfoRow label="Actual Start" value={formatDate(trip.actualStart)} />
              <InfoRow label="Actual End" value={formatDate(trip.actualEnd)} />
              <InfoRow label="Distance" value={trip.distanceKm !== null ? `${trip.distanceKm} km` : null} />
              <InfoRow label="Fuel Used" value={trip.fuelUsedLiters !== null ? `${trip.fuelUsedLiters} L` : null} />
              <InfoRow label="Notes" value={trip.notes} />
              <InfoRow label="Created" value={formatDate(trip.createdAt)} />
            </div>
          )}
        </div>

        {trip && (trip.status === 'planned' || trip.status === 'in_progress') && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
            {trip.status === 'planned' && (
              <button
                type="button"
                onClick={async () => { await startMut.mutateAsync(trip.id); onClose(); }}
                disabled={startMut.isPending}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700',
                  startMut.isPending && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Play className="h-3.5 w-3.5" /> Start Trip
              </button>
            )}
            {trip.status === 'in_progress' && (
              <button
                type="button"
                onClick={async () => { await endMut.mutateAsync(trip.id); onClose(); }}
                disabled={endMut.isPending}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700',
                  endMut.isPending && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Square className="h-3.5 w-3.5" /> End Trip
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TripForm({ onClose }: { onClose: () => void }) {
  const createMut = useCreateTrip();
  const [error, setError] = useState<string | null>(null);
  const [tripCode, setTripCode] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!tripCode.trim()) {
      setError('Trip Code is required.');
      return;
    }
    try {
      await createMut.mutateAsync({
        tripCode: tripCode.trim(),
        vehicleId: vehicleId.trim() || undefined,
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        startLocation: startLocation.trim() || undefined,
        endLocation: endLocation.trim() || undefined,
        plannedStart: plannedStart || undefined,
        plannedEnd: plannedEnd || undefined,
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
          <h2 className="text-base font-semibold text-card-foreground">New Trip</h2>
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
            <label htmlFor="tripCode" className="block text-sm font-medium text-foreground mb-1">Trip Code</label>
            <input id="tripCode" type="text" value={tripCode} onChange={(e) => setTripCode(e.target.value)} placeholder="e.g. TRIP-001" className={inputClass} />
          </div>
          <div>
            <label htmlFor="vehicleId" className="block text-sm font-medium text-foreground mb-1">Vehicle ID <span className="ml-1 text-xs text-muted-foreground">(optional)</span></label>
            <input id="vehicleId" type="text" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} placeholder="e.g. VH-001" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="driverName" className="block text-sm font-medium text-foreground mb-1">Driver Name</label>
              <input id="driverName" type="text" value={driverName} onChange={(e) => setDriverName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="driverPhone" className="block text-sm font-medium text-foreground mb-1">Driver Phone</label>
              <input id="driverPhone" type="text" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startLoc" className="block text-sm font-medium text-foreground mb-1">Start Location</label>
              <input id="startLoc" type="text" value={startLocation} onChange={(e) => setStartLocation(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="endLoc" className="block text-sm font-medium text-foreground mb-1">End Location</label>
              <input id="endLoc" type="text" value={endLocation} onChange={(e) => setEndLocation(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="plannedStart" className="block text-sm font-medium text-foreground mb-1">Planned Start</label>
              <input id="plannedStart" type="datetime-local" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="plannedEnd" className="block text-sm font-medium text-foreground mb-1">Planned End</label>
              <input id="plannedEnd" type="datetime-local" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">Notes</label>
            <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={cn(inputClass, 'h-auto py-2')} />
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

export default function TripsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const startMut = useStartTrip();
  const endMut = useEndTrip();

  const params: TripListQuery = {
    page,
    limit: 15,
    ...(status && { status }),
    ...(search && { search }),
  };

  const { data, isLoading, isError } = useTrips(params);

  const handleStatusChange = useCallback((v: string) => { setStatus(v); setPage(1); }, []);
  const handleSearchChange = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Trips</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage vehicle trip history and routes.
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
              placeholder="Search trips..."
              className={cn(
                'h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                'transition-colors'
              )}
            />
          </div>
          <Dropdown value={status} options={STATUS_OPTIONS} onChange={handleStatusChange} />
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
          <Plus className="h-4 w-4" /> New Trip
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Trip Code</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Vehicle</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Driver</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Status</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Start</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">End</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Distance</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              {!isLoading && isError && (
                <tr><td colSpan={8} className="py-12 text-center"><p className="text-sm text-destructive">Failed to load trips. Please try again.</p></td></tr>
              )}
              {!isLoading && !isError && data?.items?.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center">
                  <Route className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">No trips found. Create your first trip.</p>
                </td></tr>
              )}
              {!isLoading && data?.items?.map((trip) => (
                <tr key={trip.id} className="border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-foreground">{trip.tripCode}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground text-xs font-mono">{trip.vehicleId ?? '--'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-foreground">{trip.driverName ?? '--'}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', tripStatusClasses(trip.status))}>
                      {trip.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{formatDate(trip.actualStart ?? trip.plannedStart)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{formatDate(trip.actualEnd ?? trip.plannedEnd)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{trip.distanceKm !== null ? `${trip.distanceKm} km` : '--'}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTripId(trip.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                      >
                        <Eye className="h-3 w-3" /> View
                      </button>
                      {trip.status === 'planned' && (
                        <button
                          type="button"
                          onClick={async () => { await startMut.mutateAsync(trip.id); }}
                          disabled={startMut.isPending}
                          className={cn('inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 transition-colors', startMut.isPending && 'opacity-50')}
                        >
                          <Play className="h-3 w-3" /> Start
                        </button>
                      )}
                      {trip.status === 'in_progress' && (
                        <button
                          type="button"
                          onClick={async () => { await endMut.mutateAsync(trip.id); }}
                          disabled={endMut.isPending}
                          className={cn('inline-flex items-center gap-1 rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors', endMut.isPending && 'opacity-50')}
                        >
                          <Square className="h-3 w-3" /> End
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination pagination={data?.pagination} onPageChange={setPage} />
      </div>

      {selectedTripId !== null && (
        <TripDetailModal tripId={selectedTripId} onClose={() => setSelectedTripId(null)} />
      )}
      {showForm && <TripForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
