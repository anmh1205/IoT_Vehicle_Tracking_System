'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X, Copy, Check } from 'lucide-react';
import { useCreateDevice, useUpdateDevice } from '@/hooks/useDevices';
import type { DeviceDetail } from '@/types/device.types';

interface DeviceFormProps {
  device: DeviceDetail | null;
  onClose: () => void;
}

export function DeviceForm({ device, onClose }: DeviceFormProps) {
  const isEdit = !!device;
  const createMutation = useCreateDevice();
  const updateMutation = useUpdateDevice();

  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [imei, setImei] = useState('');
  const [vibrationThreshold, setVibrationThreshold] = useState('3');
  const [requestInterval, setRequestInterval] = useState('10');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (device) {
      setDeviceId(device.deviceId);
      setDeviceName(device.deviceName);
      setImei(device.imei ?? '');
      setVibrationThreshold(String(device.vibrationThreshold));
      setRequestInterval(String(device.requestInterval));
    }
  }, [device]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!deviceId.trim() || !deviceName.trim()) {
      setError('Device ID and Name are required.');
      return;
    }

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          id: device.id,
          data: {
            deviceName: deviceName.trim(),
            imei: imei.trim() || undefined,
            vibrationThreshold: Number(vibrationThreshold),
            requestInterval: Number(requestInterval),
          },
        });
        onClose();
      } else {
        const result = await createMutation.mutateAsync({
          deviceId: deviceId.trim(),
          deviceName: deviceName.trim(),
          imei: imei.trim() || undefined,
          vibrationThreshold: Number(vibrationThreshold),
          requestInterval: Number(requestInterval),
        });
        setCreatedToken((result as { authToken?: string })?.authToken ?? null);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message ??
        'An error occurred. Please try again.';
      setError(message);
    }
  };

  const handleCopyToken = async () => {
    if (!createdToken) return;
    await navigator.clipboard.writeText(createdToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-lg border border-border bg-card shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-card-foreground">
            {isEdit ? 'Edit Device' : 'Add Device'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Token display after creation */}
        {createdToken && (
          <div className="mx-5 mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-700 dark:bg-emerald-950">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300 mb-1">
              Device created. Save this auth token now:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-emerald-900 dark:text-emerald-200 break-all">
                {createdToken}
              </code>
              <button
                type="button"
                onClick={handleCopyToken}
                className="shrink-0 rounded p-1 hover:bg-emerald-200 dark:hover:bg-emerald-800 transition-colors"
                aria-label="Copy token"
              >
                {tokenCopied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'mt-3 w-full rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white',
                'hover:bg-emerald-700 transition-colors'
              )}
            >
              Done
            </button>
          </div>
        )}

        {/* Form */}
        {!createdToken && (
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Device ID (create only) */}
            <div>
              <label htmlFor="deviceId" className="block text-sm font-medium text-foreground mb-1">
                Device ID
              </label>
              <input
                id="deviceId"
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                disabled={isEdit}
                placeholder="e.g. ESP32-001"
                className={cn(
                  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm',
                  'placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                  'transition-colors',
                  isEdit && 'opacity-50 cursor-not-allowed'
                )}
              />
            </div>

            {/* Device Name */}
            <div>
              <label htmlFor="deviceName" className="block text-sm font-medium text-foreground mb-1">
                Device Name
              </label>
              <input
                id="deviceName"
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Tracker Unit A"
                className={cn(
                  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm',
                  'placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                  'transition-colors'
                )}
              />
            </div>

            {/* IMEI */}
            <div>
              <label htmlFor="imei" className="block text-sm font-medium text-foreground mb-1">
                IMEI
                <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
              </label>
              <input
                id="imei"
                type="text"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                placeholder="15-digit IMEI"
                className={cn(
                  'h-9 w-full rounded-md border border-border bg-background px-3 text-sm',
                  'placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                  'transition-colors'
                )}
              />
            </div>

            {/* Vibration Threshold + Request Interval side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="vibThreshold" className="block text-sm font-medium text-foreground mb-1">
                  Vibration Threshold
                </label>
                <input
                  id="vibThreshold"
                  type="number"
                  min="0"
                  step="0.1"
                  value={vibrationThreshold}
                  onChange={(e) => setVibrationThreshold(e.target.value)}
                  className={cn(
                    'h-9 w-full rounded-md border border-border bg-background px-3 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                    'transition-colors'
                  )}
                />
              </div>
              <div>
                <label htmlFor="reqInterval" className="block text-sm font-medium text-foreground mb-1">
                  Request Interval (s)
                </label>
                <input
                  id="reqInterval"
                  type="number"
                  min="1"
                  value={requestInterval}
                  onChange={(e) => setRequestInterval(e.target.value)}
                  className={cn(
                    'h-9 w-full rounded-md border border-border bg-background px-3 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
                    'transition-colors'
                  )}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'rounded-md border border-border px-4 py-1.5 text-sm font-medium transition-colors',
                  'hover:bg-accent'
                )}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  'rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground transition-colors',
                  'hover:bg-primary/90',
                  'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2',
                  isPending && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isPending ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
