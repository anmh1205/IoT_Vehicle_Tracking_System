/**
 * Dashboard Stats Cards Component
 */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVehicles } from '@/hooks/queries/use-vehicles';
import { useAlerts } from '@/hooks/queries/use-alerts';
import { useTrips } from '@/hooks/queries/use-trips';
import { Skeleton } from '@/components/ui/skeleton';
import { Car, AlertTriangle, Route } from 'lucide-react';

export function StatsCards() {
  const { data: vehiclesData, isLoading: vehiclesLoading } = useVehicles();
  const { data: alertsData, isLoading: alertsLoading } = useAlerts({ limit: 100 });
  const { data: tripsData, isLoading: tripsLoading } = useTrips();

  const totalVehicles = vehiclesData?.data.length || 0;
  const activeVehicles = vehiclesData?.data.filter(v => v.status === 'active').length || 0;
  const totalAlerts = alertsData?.data.length || 0;
  const newAlerts = alertsData?.data.filter(a => a.status === 'new').length || 0;
  const totalTrips = tripsData?.data.length || 0;
  const activeTrips = tripsData?.data.filter(t => t.status === 'active').length || 0;

  if (vehiclesLoading || alertsLoading || tripsLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
          <Car className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalVehicles}</div>
          <p className="text-xs text-muted-foreground">
            {activeVehicles} active
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAlerts}</div>
          <p className="text-xs text-muted-foreground">
            {newAlerts} new
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
          <Route className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTrips}</div>
          <p className="text-xs text-muted-foreground">
            {activeTrips} active
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Vehicles</CardTitle>
          <Car className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeVehicles}</div>
          <p className="text-xs text-muted-foreground">
            {totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0}% of total
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

