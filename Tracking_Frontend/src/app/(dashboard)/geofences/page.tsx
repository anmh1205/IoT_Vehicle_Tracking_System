'use client';

import { MapPin } from 'lucide-react';

export default function GeofencesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Geofences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define and manage geographic boundaries for vehicle monitoring.
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <MapPin className="h-12 w-12 text-muted-foreground/40" />
        <p className="mt-4 text-lg font-medium text-muted-foreground">Coming Soon</p>
        <p className="mt-1 text-sm text-muted-foreground/70">
          Geofence creation and monitoring will be available in a future update.
        </p>
      </div>
    </div>
  );
}
