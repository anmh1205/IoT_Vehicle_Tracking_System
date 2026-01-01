/**
 * Active Vehicles Component
 */
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useVehicles } from '@/hooks/queries/use-vehicles';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Car } from 'lucide-react';
import type { Vehicle } from '@/types';

export function ActiveVehicles() {
  const { data, isLoading } = useVehicles({ status: 'active', limit: 10 });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const vehicles = data?.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Vehicles</CardTitle>
        <CardDescription>Currently active vehicles in your fleet</CardDescription>
      </CardHeader>
      <CardContent>
        {vehicles.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No active vehicles
          </div>
        ) : (
          <div className="space-y-4">
            {vehicles.map((vehicle: Vehicle) => (
              <div key={vehicle.id} className="flex items-center gap-4 border-b pb-4 last:border-0">
                <Car className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{vehicle.vehicleId}</span>
                    <Badge className="bg-green-500">{vehicle.status}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {vehicle.plateNumber}
                    {vehicle.brand && vehicle.model && ` • ${vehicle.brand} ${vehicle.model}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

