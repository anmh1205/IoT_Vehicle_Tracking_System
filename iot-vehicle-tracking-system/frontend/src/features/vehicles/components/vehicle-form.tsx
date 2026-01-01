/**
 * Vehicle Form Component
 */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { vehicleSchema, type VehicleFormData } from '../schemas/vehicle.schema';
import { useCreateVehicle, useUpdateVehicle } from '@/hooks/mutations/use-vehicle-mutations';
import type { Vehicle, CreateVehicleDto, UpdateVehicleDto } from '@/types';

interface VehicleFormProps {
  vehicle?: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleForm({ vehicle, open, onOpenChange }: VehicleFormProps) {
  const router = useRouter();
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle ? {
      vehicleId: vehicle.vehicleId,
      plateNumber: vehicle.plateNumber,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      vehicleType: vehicle.vehicleType,
      vin: vehicle.vin,
      seats: vehicle.seats,
      transmission: vehicle.transmission,
      fuelType: vehicle.fuelType,
      mileageKm: vehicle.mileageKm,
      registrationNumber: vehicle.registrationNumber,
      insuranceExpiry: vehicle.insuranceExpiry,
      status: vehicle.status,
      ownerId: vehicle.ownerId,
      deviceId: vehicle.deviceId,
    } : {
      vehicleId: '',
      plateNumber: '',
      status: 'active',
    },
  });

  const onSubmit = async (data: VehicleFormData) => {
    try {
      if (vehicle) {
        await updateMutation.mutateAsync({
          id: vehicle.id,
          data: data as UpdateVehicleDto,
        });
      } else {
        await createMutation.mutateAsync(data as CreateVehicleDto);
      }
      onOpenChange(false);
      form.reset();
      if (!vehicle) {
        router.push('/dashboard/vehicles');
      }
    } catch (error) {
      // Error handling is done in mutation hooks
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Edit Vehicle' : 'Create Vehicle'}</DialogTitle>
          <DialogDescription>
            {vehicle ? 'Update vehicle information' : 'Add a new vehicle to your fleet'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vehicleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle ID *</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!!vehicle} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plate Number *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : vehicle ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

