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
  Users,
} from 'lucide-react';
import { useCustomers, useCustomerDetail, useCreateCustomer, useDeleteCustomer } from '@/hooks/useCustomers';
import type { Customer, CreateCustomerInput, CustomerListQuery } from '@/types/customer.types';
import type { PaginationMeta } from '@/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
] as const;

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
] as const;

function customerStatusClasses(status: Customer['status']): string {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'inactive': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
}

function customerTypeClasses(type: Customer['customerType']): string {
  switch (type) {
    case 'individual': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'company': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString();
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

function CustomerDetailModal({
  customerId,
  onClose,
}: {
  customerId: number;
  onClose: () => void;
}) {
  const { data: customer, isLoading, isError } = useCustomerDetail(customerId);
  const deleteMut = useDeleteCustomer();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    await deleteMut.mutateAsync(customerId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl max-h-[85vh] overflow-hidden rounded-lg border border-border bg-card shadow-2xl mx-4">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-card-foreground truncate">
              {isLoading ? 'Loading...' : customer?.name ?? 'Customer Detail'}
            </h2>
            {customer && (
              <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', customerStatusClasses(customer.status))}>
                {customer.status}
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
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          )}
          {isError && <p className="py-8 text-center text-sm text-destructive">Failed to load customer details.</p>}
          {customer && (
            <div className="space-y-1 divide-y divide-border/50">
              <InfoRow label="Customer Code" value={<code className="font-mono text-xs">{customer.customerCode}</code>} />
              <InfoRow label="Name" value={customer.name} />
              <InfoRow label="Type" value={<span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', customerTypeClasses(customer.customerType))}>{customer.customerType}</span>} />
              <InfoRow label="Email" value={customer.email} />
              <InfoRow label="Phone" value={customer.phone} />
              <InfoRow label="Address" value={customer.address} />
              <InfoRow label="Created" value={formatDate(customer.createdAt)} />
            </div>
          )}
        </div>

        {customer && (
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

function CustomerForm({ onClose }: { onClose: () => void }) {
  const createMut = useCreateCustomer();
  const [error, setError] = useState<string | null>(null);
  const [customerCode, setCustomerCode] = useState('');
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState('individual');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!customerCode.trim() || !name.trim()) {
      setError('Customer Code and Name are required.');
      return;
    }
    try {
      await createMut.mutateAsync({
        customerCode: customerCode.trim(),
        name: name.trim(),
        customerType,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
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
          <h2 className="text-base font-semibold text-card-foreground">Add Customer</h2>
          <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cCode" className="block text-sm font-medium text-foreground mb-1">Customer Code</label>
              <input id="cCode" type="text" value={customerCode} onChange={(e) => setCustomerCode(e.target.value)} placeholder="e.g. CUST-001" className={inputClass} />
            </div>
            <div>
              <label htmlFor="cType" className="block text-sm font-medium text-foreground mb-1">Type</label>
              <select
                id="cType"
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className={inputClass}
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="cName" className="block text-sm font-medium text-foreground mb-1">Name</label>
            <input id="cName" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name or company name" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cEmail" className="block text-sm font-medium text-foreground mb-1">Email <span className="text-xs text-muted-foreground">(optional)</span></label>
              <input id="cEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className={inputClass} />
            </div>
            <div>
              <label htmlFor="cPhone" className="block text-sm font-medium text-foreground mb-1">Phone <span className="text-xs text-muted-foreground">(optional)</span></label>
              <input id="cPhone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+84..." className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="cAddress" className="block text-sm font-medium text-foreground mb-1">Address <span className="text-xs text-muted-foreground">(optional)</span></label>
            <textarea id="cAddress" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className={cn(inputClass, 'h-auto py-2')} />
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

export default function CustomersPage() {
  const [status, setStatus] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const params: CustomerListQuery = {
    page,
    limit: 15,
    ...(status && { status }),
    ...(search && { search }),
  };

  const { data, isLoading, isError } = useCustomers(params);

  const handleStatusChange = useCallback((v: string) => { setStatus(v); setPage(1); }, []);
  const handleTypeChange = useCallback((v: string) => { setTypeFilter(v); setPage(1); }, []);
  const handleSearchChange = useCallback((v: string) => { setSearch(v); setPage(1); }, []);

  const filteredItems = data?.items?.filter((c) => !typeFilter || c.customerType === typeFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Customers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage customer accounts and their vehicle fleets.
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
              placeholder="Search customers..."
              className={cn(
                'h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                'transition-colors'
              )}
            />
          </div>
          <Dropdown value={typeFilter} options={TYPE_OPTIONS} onChange={handleTypeChange} />
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
          <Plus className="h-4 w-4" /> Add Customer
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Code</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Name</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Type</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Email</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Status</th>
                <th className="whitespace-nowrap px-3 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              {!isLoading && isError && (
                <tr><td colSpan={7} className="py-12 text-center"><p className="text-sm text-destructive">Failed to load customers.</p></td></tr>
              )}
              {!isLoading && !isError && filteredItems?.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center">
                  <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-sm text-muted-foreground">No customers found. Add your first customer.</p>
                </td></tr>
              )}
              {!isLoading && filteredItems?.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-accent/50 transition-colors">
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-foreground">{c.customerCode}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', customerTypeClasses(c.customerType))}>
                      {c.customerType}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{c.email ?? '--'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">{c.phone ?? '--'}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-medium', customerStatusClasses(c.status))}>
                      {c.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
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
        <CustomerDetailModal customerId={selectedId} onClose={() => setSelectedId(null)} />
      )}
      {showForm && <CustomerForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
