'use client';

import { useState } from 'react';
import {
  MapPin,
  Shield,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDeleteGeofence, useUpdateGeofence } from '@/hooks/useGeofences';
import { GeofenceForm } from './geofence-form';
import type { DevicePosition } from '@/types/device.types';
import type { Geofence } from '@/types/geofence.types';

const STATUS_COLORS: Record<string, string> = {
  running: 'bg-emerald-500',
  stopped: 'bg-amber-500',
  disconnected: 'bg-zinc-400',
};

type Tab = 'vehicles' | 'geofences';

interface MapSidebarProps {
  positions: DevicePosition[];
  geofences: Geofence[];
  isLoadingPositions: boolean;
  isLoadingGeofences: boolean;
  onSelectDevice: (position: DevicePosition) => void;
  onSelectGeofence: (geofence: Geofence) => void;
  selectedDeviceId?: string | null;
}

export function MapSidebar({
  positions,
  geofences,
  isLoadingPositions,
  isLoadingGeofences,
  onSelectDevice,
  onSelectGeofence,
  selectedDeviceId,
}: MapSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<Tab>('vehicles');
  const [showForm, setShowForm] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);

  const deleteMutation = useDeleteGeofence();
  const updateMutation = useUpdateGeofence();

  function handleToggleVisibility(geofence: Geofence) {
    updateMutation.mutate({
      id: geofence.id,
      data: { isActive: !geofence.displayHidden },
    });
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id);
  }

  function handleEdit(geofence: Geofence) {
    setEditingGeofence(geofence);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingGeofence(null);
  }

  if (collapsed) {
    return (
      <div className="flex w-10 flex-col items-center border-r border-zinc-200 bg-white py-2 dark:border-zinc-800 dark:bg-zinc-950">
        <button
          onClick={() => setCollapsed(false)}
          className="rounded p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-72 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <div className="flex gap-1">
          <button
            onClick={() => setTab('vehicles')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              tab === 'vehicles'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            Vehicles
          </button>
          <button
            onClick={() => setTab('geofences')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              tab === 'geofences'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300'
            )}
          >
            <Shield className="h-3.5 w-3.5" />
            Geofences
          </button>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Collapse sidebar"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'vehicles' && (
          <VehiclesTab
            positions={positions}
            isLoading={isLoadingPositions}
            onSelect={onSelectDevice}
            selectedDeviceId={selectedDeviceId}
          />
        )}
        {tab === 'geofences' && (
          <GeofencesTab
            geofences={geofences}
            isLoading={isLoadingGeofences}
            onSelect={onSelectGeofence}
            onToggleVisibility={handleToggleVisibility}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAdd={() => {
              setEditingGeofence(null);
              setShowForm(true);
            }}
          />
        )}
      </div>

      {/* Geofence Form */}
      {showForm && (
        <GeofenceForm geofence={editingGeofence} onClose={handleCloseForm} />
      )}
    </div>
  );
}

/* ---------- Vehicles Tab ---------- */

function VehiclesTab({
  positions,
  isLoading,
  onSelect,
  selectedDeviceId,
}: {
  positions: DevicePosition[];
  isLoading: boolean;
  onSelect: (p: DevicePosition) => void;
  selectedDeviceId?: string | null;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
        ))}
      </div>
    );
  }

  if (!positions.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-sm text-zinc-400">
        <MapPin className="mb-2 h-8 w-8" />
        No vehicles with positions
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {positions.map((pos) => (
        <button
          key={pos.deviceId}
          onClick={() => onSelect(pos)}
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900',
            selectedDeviceId === pos.deviceId && 'bg-zinc-50 dark:bg-zinc-900'
          )}
        >
          <span
            className={cn(
              'h-2.5 w-2.5 shrink-0 rounded-full',
              STATUS_COLORS[pos.currentStatus] ?? 'bg-zinc-400'
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {pos.deviceName}
            </div>
            <div className="truncate text-xs text-zinc-400">
              {pos.deviceId}
            </div>
          </div>
          <span className="text-[10px] capitalize text-zinc-400">
            {pos.currentStatus}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Geofences Tab ---------- */

function GeofencesTab({
  geofences,
  isLoading,
  onSelect,
  onToggleVisibility,
  onEdit,
  onDelete,
  onAdd,
}: {
  geofences: Geofence[];
  isLoading: boolean;
  onSelect: (g: Geofence) => void;
  onToggleVisibility: (g: Geofence) => void;
  onEdit: (g: Geofence) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}) {
  return (
    <div>
      {/* Add button */}
      <div className="p-3">
        <button
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Geofence
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2 px-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      )}

      {!isLoading && !geofences.length && (
        <div className="flex flex-col items-center justify-center py-12 text-sm text-zinc-400">
          <Shield className="mb-2 h-8 w-8" />
          No geofences created
        </div>
      )}

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {geofences.map((gf) => (
          <div
            key={gf.id}
            className="group flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <button
              onClick={() => onSelect(gf)}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: gf.color || '#3b82f6' }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {gf.name}
                </div>
                <div className="text-[10px] text-zinc-400">
                  {gf.geofenceType} | {gf.triggerOn}
                </div>
              </div>
            </button>

            {/* Actions -- visible on hover */}
            <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => onToggleVisibility(gf)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                aria-label={gf.displayHidden ? 'Show geofence' : 'Hide geofence'}
              >
                {gf.displayHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => onEdit(gf)}
                className="rounded p-1 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                aria-label="Edit geofence"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(gf.id)}
                className="rounded p-1 text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                aria-label="Delete geofence"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
