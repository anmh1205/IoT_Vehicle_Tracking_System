'use client';

import { useState } from 'react';
import { useCreateGeofence, useUpdateGeofence } from '@/hooks/useGeofences';
import type { Geofence, CreateGeofenceInput } from '@/types/geofence.types';
import { X } from 'lucide-react';

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

const TRIGGER_OPTIONS = [
  { value: 'enter', label: 'Enter' },
  { value: 'exit', label: 'Exit' },
  { value: 'both', label: 'Both' },
] as const;

interface GeofenceFormProps {
  geofence?: Geofence | null;
  onClose: () => void;
}

export function GeofenceForm({ geofence, onClose }: GeofenceFormProps) {
  const isEditing = !!geofence;

  const [name, setName] = useState(geofence?.name ?? '');
  const [description, setDescription] = useState(geofence?.description ?? '');
  const [geofenceType, setGeofenceType] = useState<string>(geofence?.geofenceType ?? 'circle');
  const [centerLat, setCenterLat] = useState(geofence?.centerLatitude?.toString() ?? '');
  const [centerLng, setCenterLng] = useState(geofence?.centerLongitude?.toString() ?? '');
  const [radius, setRadius] = useState(geofence?.radiusMeters?.toString() ?? '500');
  const [triggerOn, setTriggerOn] = useState(geofence?.triggerOn ?? 'both');
  const [color, setColor] = useState(geofence?.color ?? '#3b82f6');

  const createMutation = useCreateGeofence();
  const updateMutation = useUpdateGeofence();

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const data: CreateGeofenceInput = {
      name: name.trim(),
      geofenceType,
      triggerOn,
      color,
      description: description.trim() || undefined,
    };

    if (geofenceType === 'circle') {
      data.centerLatitude = parseFloat(centerLat);
      data.centerLongitude = parseFloat(centerLng);
      data.radiusMeters = parseFloat(radius);
    }

    if (isEditing && geofence) {
      updateMutation.mutate(
        { id: geofence.id, data },
        { onSuccess: onClose }
      );
    } else {
      createMutation.mutate(data, { onSuccess: onClose });
    }
  }

  const inputClass =
    'w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-500';

  const labelClass = 'block text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1';

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {isEditing ? 'Edit Geofence' : 'New Geofence'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={labelClass}>Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Warehouse zone"
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Type</label>
          <select
            value={geofenceType}
            onChange={(e) => setGeofenceType(e.target.value)}
            className={inputClass}
          >
            <option value="circle">Circle</option>
            <option value="polygon">Polygon</option>
          </select>
        </div>

        {geofenceType === 'circle' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={centerLat}
                  onChange={(e) => setCenterLat(e.target.value)}
                  placeholder="21.0285"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={centerLng}
                  onChange={(e) => setCenterLng(e.target.value)}
                  placeholder="105.8542"
                  className={inputClass}
                  required
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Radius (meters)</label>
              <input
                type="number"
                min="10"
                step="10"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </>
        )}

        <div>
          <label className={labelClass}>Trigger On</label>
          <div className="flex gap-1">
            {TRIGGER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTriggerOn(opt.value)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  triggerOn === opt.value
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Color</label>
          <div className="flex gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-zinc-900 dark:border-zinc-100' : 'border-transparent hover:scale-105'
                }`}
                style={{ background: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="flex-1 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
