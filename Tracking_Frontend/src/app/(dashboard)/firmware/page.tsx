'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firmwareApi } from '@/lib/api/firmware';
import { cn } from '@/lib/utils';
import {
  HardDrive,
  Upload,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  X,
} from 'lucide-react';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FirmwarePage() {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['firmware'],
    queryFn: () => firmwareApi.list({ limit: 50 }).then((r) => r.data.data),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => firmwareApi.activate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['firmware'] }),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => firmwareApi.deactivate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['firmware'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => firmwareApi.delete(id),
    onSuccess: () => {
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['firmware'] });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => firmwareApi.create(formData),
    onSuccess: () => {
      setShowUpload(false);
      queryClient.invalidateQueries({ queryKey: ['firmware'] });
    },
  });

  function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    uploadMutation.mutate(formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Firmware</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage device firmware versions and deployments.
          </p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Upload Firmware
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-card-foreground">Upload New Firmware</h2>
            <button onClick={() => setShowUpload(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleUpload} className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="fw-version" className="mb-1 block text-xs font-medium text-muted-foreground">Version</label>
              <input id="fw-version" name="version" required placeholder="e.g. 1.2.0"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label htmlFor="fw-file" className="mb-1 block text-xs font-medium text-muted-foreground">Firmware File</label>
              <input id="fw-file" name="file" type="file" required
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:text-xs file:font-medium file:text-primary" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="fw-desc" className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
              <textarea id="fw-desc" name="description" rows={2} placeholder="Optional description..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" disabled={uploadMutation.isPending}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
                {uploadMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Upload
              </button>
            </div>
            {uploadMutation.isError && (
              <p className="sm:col-span-2 text-sm text-destructive">Upload failed. Please try again.</p>
            )}
          </form>
        </div>
      )}

      {/* Firmware Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load firmware list.
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <HardDrive className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">No firmware versions uploaded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Version</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Filename</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Size</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((fw) => (
                <tr key={fw.id} className="border-b border-border/50 transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3 font-mono font-medium text-card-foreground">{fw.version}</td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">{fw.filename}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatFileSize(fw.size)}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      fw.isActive
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400'
                    )}>
                      {fw.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(fw.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => fw.isActive ? deactivateMutation.mutate(fw.id) : activateMutation.mutate(fw.id)}
                        title={fw.isActive ? 'Deactivate' : 'Activate'}
                        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {fw.isActive ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => setDeleteId(fw.id)}
                        title="Delete"
                        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-card-foreground">Delete Firmware</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to delete this firmware version? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
