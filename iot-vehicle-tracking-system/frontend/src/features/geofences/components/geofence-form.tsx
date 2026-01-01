/**
 * Geofence Form Component
 */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { geofenceSchema, type GeofenceFormData } from '../schemas/geofence.schema';
import { useCreateGeofence, useUpdateGeofence } from '@/hooks/mutations/use-geofence-mutations';
import type { Geofence, CreateGeofenceDto, UpdateGeofenceDto } from '@/types';
import { Loader2 } from 'lucide-react';

interface GeofenceFormProps {
    geofence?: Geofence;
    onSuccess?: () => void;
}

export function GeofenceForm({ geofence, onSuccess }: GeofenceFormProps) {
    const router = useRouter();
    const createMutation = useCreateGeofence();
    const updateMutation = useUpdateGeofence();

    const form = useForm<GeofenceFormData>({
        resolver: zodResolver(geofenceSchema),
        defaultValues: geofence ? {
            name: geofence.name,
            description: geofence.description || '',
            type: geofence.type,
            center: geofence.center,
            radius: geofence.radius,
            coordinates: geofence.coordinates,
            isActive: geofence.isActive,
        } : {
            name: '',
            description: '',
            type: 'circle',
            center: { latitude: 21.0285, longitude: 105.8542 }, // Hanoi default
            radius: 500,
            isActive: true,
        },
    });

    const watchType = form.watch('type');

    const onSubmit = async (data: GeofenceFormData) => {
        try {
            if (geofence) {
                await updateMutation.mutateAsync({
                    id: geofence.id,
                    data: data as UpdateGeofenceDto,
                });
            } else {
                await createMutation.mutateAsync(data as CreateGeofenceDto);
            }
            onSuccess?.();
            if (!geofence) {
                router.push('/dashboard/geofences');
            }
        } catch (error) {
            // Error handling in mutation hooks
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{geofence ? 'Edit Geofence' : 'Create Geofence'}</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name *</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="e.g., Downtown Area" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={!!geofence}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="circle">Circle</SelectItem>
                                                <SelectItem value="polygon">Polygon</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="Optional description" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Circle Type Fields */}
                        {watchType === 'circle' && (
                            <div className="space-y-4">
                                <h4 className="font-medium">Circle Configuration</h4>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <FormField
                                        control={form.control}
                                        name="center.latitude"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Latitude</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="center.longitude"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Longitude</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="radius"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Radius (meters)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Polygon Type Fields */}
                        {watchType === 'polygon' && (
                            <div className="space-y-4">
                                <h4 className="font-medium">Polygon Configuration</h4>
                                <FormDescription>
                                    For polygon geofences, please use the map interface to draw the boundary.
                                    This form currently supports circle geofences only.
                                </FormDescription>
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isLoading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : geofence ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
