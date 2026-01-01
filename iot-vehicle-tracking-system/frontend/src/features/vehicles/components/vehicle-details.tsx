/**
 * Vehicle Details Component
 */
'use client';

import { useVehicle } from '@/hooks/queries/use-vehicle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { VehicleForm } from './vehicle-form';
import { useDeleteVehicle } from '@/hooks/mutations/use-vehicle-mutations';
import { useRouter } from 'next/navigation';
import { Edit, Trash2 } from 'lucide-react';

interface VehicleDetailsProps {
  vehicleId: number;
}

export function VehicleDetails({ vehicleId }: VehicleDetailsProps) {
  const { data, isLoading } = useVehicle(vehicleId);
  const [editOpen, setEditOpen] = useState(false);
  const deleteMutation = useDeleteVehicle();
  const router = useRouter();

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      await deleteMutation.mutateAsync(vehicleId);
      router.push('/dashboard/vehicles');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data?.data) {
    return <div>Vehicle not found</div>;
  }

  const vehicle = data.data;

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle Information</CardTitle>
          <CardDescription>Basic vehicle details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Vehicle ID</label>
              <p className="text-sm">{vehicle.vehicleId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Plate Number</label>
              <p className="text-sm">{vehicle.plateNumber}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Brand</label>
              <p className="text-sm">{vehicle.brand || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Model</label>
              <p className="text-sm">{vehicle.model || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Year</label>
              <p className="text-sm">{vehicle.year || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Color</label>
              <p className="text-sm">{vehicle.color || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <div>
                <Badge>{vehicle.status}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <VehicleForm vehicle={vehicle} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

