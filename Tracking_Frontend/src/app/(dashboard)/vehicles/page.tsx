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
  Trash2,
  Car,
  Link,
  Unlink,
} from 'lucide-react';
import { useVehicles, useVehicleDetail, useCreateVehicle, useUpdateVehicle, useDeleteVehicle, useAssignDevice, useUnassignDevice } from '@/hooks/useVehicles';
import type { Vehicle, CreateVehicleInput, VehicleListQuery } from '@/types/vehicle.types';
import type { PaginationMeta } from '@/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'retired', label: 'Retired' },
] as const;

function vehicleStatusClasses(status: Vehicle['status']): string {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'inactive': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    case 'maintenance': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'retired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString();
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

function VehicleDetailModal({
  vehicleId,
  onClose,
}: {
  vehicleId: number;
  onClose: () => void;
}) {
  const { data: vehicle, isLoading, isError } = useVehicleDetail(vehicleId);
  const deleteMut = useDeleteVehicle();
  const assignMut = useAssignDevice();
  const unassignMut = useUnassignDevice();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [assignDeviceId, setAssignDeviceId] = useState('');

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteMut.mutateAsync(vehicleId);
    onClose();
  };

  const handleAssign = async () => {
    if (!assignDeviceId.trim()) return;
    await assignMut.mutateAsync({ id: vehicleId, deviceId: assignDeviceId.trim() });
    setShowAssign(false);
    setAssignDeviceId('');
  };

  const handleUnassign = async () => {
    await unassignMut.mutateAsync(vehicleId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl max-h-[85vh] overflow-hidden rounded-lg border border-border bg-card shadow-2xl mx-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-card-foreground truncate">
              {isLoading ? 'Loading...' : vehicle?.vehicleId ?? 'Vehicle Detail'}
            </h2>
            {vehicle && (
              <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', vehicleStatusClasses(vehicle.status))}>
                {vehicle.status}
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
          {isError && <p className="py-8 text-center text-sm text-destructive">Failed to load vehicle details.</p>}
          {vehicle && (
            <div className="space-y-1 divide-y divide-border/50">
              <InfoRow label="Vehicle ID" value={<code className="font-mono text-xs">{vehicle.vehicleId}</code>} />
              <InfoRow label="Plate Number" value={vehicle.plateNumber} />
              <InfoRow label="Type" value={vehicle.vehicleType} />
              <InfoRow label="Brand" value={vehicle.brand} />
              <InfoRow label="Model" value={vehicle.model} />
              <InfoRow label="Year" value={vehicle.year} />
              <InfoRow label="Color" value={vehicle.color} />
              <InfoRow label="Device" value={vehicle.deviceId ? <code className="font-mono text-xs">{vehicle.deviceId}</code> : null} />
              <InfoRow label="Customer ID" value={vehicle.customerId} />
              <InfoRow label="Created" value={formatDate(vehicle.createdAt)} />
            </div>
          )}

          {vehicle && showAssign && (
            <div className="mt-4 space-y-2">
              <label htmlFor="assignDevice" className="block text-sm font-medium text-foreground">Device ID to assign</label>
              <div className="flex gap-2">
                <input
                  id="assignDevice"
                  type="text"
                  value={assignDeviceId}
                  onChange={(e) => setAssignDeviceId(e.target.value)}
                  placeholder="e.g. ESP32-001"
                  className={cn(
                    'h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary'
                  )}
                />
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={assignMut.isPending}
                  className={cn(
                    'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
                    assignMut.isPending && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {assignMut.isPending ? 'Assigning...' : 'Assign'}
                </button>
                <button type="button" onClick={() => setShowAssign(false)} className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {vehicle && (
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
            <div className="flex items-center gap-2">
              {vehicle.deviceId ? (
                <button
                  type="button"
                  onClick={handleUnassign}
                  disabled={unassignMut.isPending}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent',
                    unassignMut.isPending && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Unlink className="h-3.5 w-3.5" /> Unassign Device
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAssign(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Link className="h-3.5 w-3.5" /> Assign Device
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VehicleForm({ onClose }: { onClose: () => void }) {
  const createMut = useCreateVehicle();
  const [error, setError] = useState<string | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!vehicleId.trim()) {
      setError('Vehicle ID is required.');
      return;
    }
    try {
      await createMut.mutateAsync({
        vehicleId: vehicleId.trim(),
        plateNumber: plateNumber.trim() || undefined,
        deviceId: deviceId.trim() || undefined,
        vehicleType: vehicleType.trim() || undefined,
        brand: brand.trim() || undefined,
        model: model.trim() || undefined,
        year: year ? Number(year) : undefined,
        color: color.trim() || undefined,
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
          <h2 className="text-base font-semibold text-card-foreground">Add Vehicle</h2>
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
            <label htmlFor="vId" className="block text-sm font-medium text-foreground mb-1">Vehicle ID</label>
            <input id="vId" type="text" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} placeholder="e.g. VH-001" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="plate" className="block text-sm font-medium text-foreground mb-1">Plate Number</label>
              <input id="plate" type="text" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="e.g. 51A-12345" className={inputClass} />
            </div>
            <div>
              <label htmlFor="vDevice" className="block text-sm font-medium text-foreground mb-1">Device ID</label>
              <input id="vDevice" type="text" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} placeholder="e.g. ESP32-001" className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="vType" className="block text-sm font-medium text-foreground mb-1">Vehicle Type</label>
            <input id="vType" type="text" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="e.g. truck, car, motorcycle" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vBrand" className="block text-sm font-medium text-foreground mb-1">Brand</label>
              <input id="vBrand" type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Toyota" className={inputClass} />
            </div>
            <div>
              <label htmlFor="vModel" className="block text-sm font-medium text-foreground mb-1">Model</label>
              <input id="vModel" type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Hilux" className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="vYear" className="block text-sm font-medium text-foreground mb-1">Year</label>
              <input id="vYear" type="number" min="1990" max="2030" value={year} onChange={(e) => setYear(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="vColor" className="block text-sm font-medium text-foreground mb-1">Color</label>
              <input id="vColor" type="text" value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. White" className={inputClass} />
            </div>
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

export default function VehiclesPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const params: VehicleListQuery = {
    page,
    limit: 15,
    ...(status && { status }),
    ...(search && { search }),
  };

  const { data, isLoading, isError } = useVehicles(params);

  const handleStatusChange = useCallback((v: string) => { setStatus(v); setPage(1); }, []);
  const handleSearchChange = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Vehicles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage registered vehicles and their assignments.
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
              placeholder="Search vehicles..."
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
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Vehicle ID</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Plate</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Type</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Brand / Model</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Device</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Customer</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Status</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              {!isLoading && isError && (
                <tr><td colSpan={8} className="py-12 text-center"><p className="text-sm text-destructive">Failed to load vehicles.</p></td></tr>
              )}
              {!isLoading && !isError && data?.items?.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center">
                  <Car className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">No vehicles found. Add your first vehicle.</p>
                </td></tr>
              )}
              {!isLoading && data?.items?.map((v) => (
                <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-foreground">{v.vehicleId}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-foreground">{v.plateNumber ?? '--'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground text-xs">{v.vehicleType ?? '--'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {v.brand || v.model ? `${v.brand ?? ''} ${v.model ?? ''}`.trim() : '--'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs font-mono text-muted-foreground">{v.deviceId ?? '--'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{v.customerId ?? '--'}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', vehicleStatusClasses(v.status))}>
                      {v.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedId(v.id)}
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

      {selectedId !== null && (
        <VehicleDetailModal vehicleId={selectedId} onClose={() => setSelectedId(null)} />
      )}
      {showForm && <VehicleForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
