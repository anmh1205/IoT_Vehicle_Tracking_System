'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Edit, Trash2, RefreshCw, Copy, Check } from 'lucide-react';
import { DeviceStatusBadge } from './device-status-badge';
import { DeviceSessionTable } from './device-session-table';
import { useDeviceDetail, useDeleteDevice } from '@/hooks/useDevices';
import { devicesApi } from '@/lib/api/devices';
import type { DeviceDetail } from '@/types/device.types';

interface DeviceDetailModalProps {
  deviceId: number | null;
  onClose: () => void;
  onEdit: (device: DeviceDetail) => void;
}

type Tab = 'info' | 'sessions';

function formatRuntime(seconds: number): string {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground text-right">{value ?? '--'}</span>
    </div>
  );
}

export function DeviceDetailModal({ deviceId, onClose, onEdit }: DeviceDetailModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [tokenCopied, setTokenCopied] = useState(false);
  const [regeneratedToken, setRegeneratedToken] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: device, isLoading, isError } = useDeviceDetail(deviceId);
  const deleteMutation = useDeleteDevice();

  if (!deviceId) return null;

  const handleRegenerate = async () => {
    if (!deviceId) return;
    setIsRegenerating(true);
    try {
      const res = await devicesApi.regenerateToken(deviceId);
      setRegeneratedToken(res.data.data.authToken);
    } catch {
      // Error handled silently
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyToken = async () => {
    if (!regeneratedToken) return;
    await navigator.clipboard.writeText(regeneratedToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteMutation.mutateAsync(deviceId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-xl max-h-[85vh] overflow-hidden rounded-lg border border-border bg-card shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-card-foreground truncate">
              {isLoading ? 'Loading...' : device?.deviceName ?? 'Device Detail'}
            </h2>
            {device && <DeviceStatusBadge status={device.currentStatus} />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5">
          {(['info', 'sessions'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative px-3 py-2.5 text-sm font-medium capitalize transition-colors',
                activeTab === tab
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(85vh - 180px)' }}>
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

          {isError && (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load device details.
            </p>
          )}

          {device && activeTab === 'info' && (
            <div className="space-y-1 divide-y divide-border/50">
              <InfoRow label="Device ID" value={<code className="font-mono text-xs">{device.deviceId}</code>} />
              <InfoRow label="Name" value={device.deviceName} />
              <InfoRow label="IMEI" value={device.imei} />
              <InfoRow label="Firmware" value={device.firmwareVersion} />
              <InfoRow label="Target Firmware" value={device.targetFirmwareVersion} />
              <InfoRow label="Vibration Threshold" value={device.vibrationThreshold} />
              <InfoRow label="Request Interval" value={`${device.requestInterval}s`} />
              <InfoRow label="Total Runtime" value={formatRuntime(device.totalRuntimeSeconds)} />
              <InfoRow label="Last Error Code" value={device.lastErrorCode || 'None'} />
              <InfoRow
                label="Location"
                value={
                  device.latitude !== null && device.longitude !== null
                    ? `${device.latitude.toFixed(6)}, ${device.longitude.toFixed(6)}`
                    : null
                }
              />
              <InfoRow label="Created" value={new Date(device.createdAt).toLocaleString()} />
              <InfoRow
                label="Last Seen"
                value={device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleString() : 'Never'}
              />
              {device.config && Object.keys(device.config).length > 0 && (
                <InfoRow
                  label="Config"
                  value={
                    <code className="text-xs font-mono break-all">
                      {JSON.stringify(device.config)}
                    </code>
                  }
                />
              )}

              {/* Regenerated token display */}
              {regeneratedToken && (
                <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1">
                    New Auth Token (save it now, it won&apos;t be shown again):
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-amber-900 dark:text-amber-200 break-all">
                      {regeneratedToken}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="shrink-0 rounded p-1 hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
                      aria-label="Copy token"
                    >
                      {tokenCopied ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {device && activeTab === 'sessions' && (
            <div>
              {device.currentSession && (
                <div className="mb-4">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                    Current Session
                  </h3>
                  <DeviceSessionTable sessions={[device.currentSession]} />
                </div>
              )}
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                Recent Sessions
              </h3>
              <DeviceSessionTable sessions={device.recentSessions} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {device && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
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
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors',
                  'hover:bg-accent',
                  isRegenerating && 'opacity-50 cursor-not-allowed'
                )}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isRegenerating && 'animate-spin')} />
                Regen Token
              </button>
              <button
                type="button"
                onClick={() => onEdit(device)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors',
                  'hover:bg-primary/90'
                )}
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
