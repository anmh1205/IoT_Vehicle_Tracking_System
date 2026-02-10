'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exportsApi } from '@/lib/api/exports';
import { cn } from '@/lib/utils';
import {
  Download,
  Plus,
  Loader2,
  FileDown,
  X,
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  processing: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-red-500/15 text-red-600 dark:text-red-400',
};

const EXPORT_TYPES = [
  { value: 'trips', label: 'Trips Report' },
  { value: 'devices', label: 'Device Inventory' },
  { value: 'alerts', label: 'Alerts History' },
  { value: 'telemetry', label: 'Telemetry Data' },
];

export default function ExportsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState(EXPORT_TYPES[0].value);

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['exports'],
    queryFn: () => exportsApi.list().then((r) => r.data.data),
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: (exportType: string) => exportsApi.create({ exportType }),
    onSuccess: () => {
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(selectedType);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Exports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate and download data exports.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Export
        </button>
      </div>

      {/* Create Export Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-card-foreground">Create Export</h2>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="mt-4 flex items-end gap-4">
            <div className="flex-1">
              <label htmlFor="export-type" className="mb-1 block text-xs font-medium text-muted-foreground">Export Type</label>
              <select
                id="export-type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {EXPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </button>
          </form>
          {createMutation.isError && (
            <p className="mt-2 text-sm text-destructive">Failed to create export job.</p>
          )}
        </div>
      )}

      {/* Jobs List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load export jobs.
        </div>
      ) : !jobs?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <FileDown className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No export jobs yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Completed</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b border-border/50 transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium text-card-foreground capitalize">{job.exportType}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_STYLES[job.status] ?? STATUS_STYLES.pending
                    )}>
                      {job.status === 'processing' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(job.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {job.completedAt ? new Date(job.completedAt).toLocaleString() : '--'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {job.status === 'completed' && job.filePath && (
                      <a
                        href={job.filePath}
                        download
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
