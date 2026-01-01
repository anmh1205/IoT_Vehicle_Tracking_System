/**
 * Geofence Details Component
 */
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Map, Edit, Trash2, Circle, Hexagon, Car } from 'lucide-react';
import type { Geofence } from '@/types';
import { useDeleteGeofence } from '@/hooks/mutations/use-geofence-mutations';
import { useRouter } from 'next/navigation';

interface GeofenceDetailsProps {
    geofence: Geofence;
    onEdit?: () => void;
}

export function GeofenceDetails({ geofence, onEdit }: GeofenceDetailsProps) {
    const router = useRouter();
    const deleteMutation = useDeleteGeofence();

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this geofence?')) {
            try {
                await deleteMutation.mutateAsync(geofence.id);
                router.push('/dashboard/geofences');
            } catch (error) {
                // Error handled by mutation
            }
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-primary/10 p-3">
                            {geofence.type === 'circle' ? (
                                <Circle className="h-6 w-6 text-primary" />
                            ) : (
                                <Hexagon className="h-6 w-6 text-primary" />
                            )}
                        </div>
                        <div>
                            <CardTitle className="text-2xl">{geofence.name}</CardTitle>
                            <p className="text-muted-foreground capitalize">
                                {geofence.type} Geofence
                            </p>
                        </div>
                    </div>
                    <Badge className={geofence.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                        {geofence.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                </CardHeader>
                <CardContent>
                    {geofence.description && (
                        <p className="text-muted-foreground mb-4">{geofence.description}</p>
                    )}
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Details Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Geometry Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Map className="h-5 w-5" />
                            Geometry
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {geofence.type === 'circle' && geofence.center && (
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Center Point</p>
                                    <p className="font-medium">
                                        {geofence.center.latitude.toFixed(6)}, {geofence.center.longitude.toFixed(6)}
                                    </p>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-sm text-muted-foreground">Radius</p>
                                    <p className="font-medium">{geofence.radius} meters</p>
                                </div>
                            </div>
                        )}
                        {geofence.type === 'polygon' && geofence.coordinates && (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">
                                    {geofence.coordinates.length} Points
                                </p>
                                <div className="max-h-40 overflow-y-auto">
                                    {geofence.coordinates.map((point, index) => (
                                        <p key={index} className="text-sm font-mono">
                                            {index + 1}. ({point.latitude.toFixed(4)}, {point.longitude.toFixed(4)})
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Assigned Vehicles */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Car className="h-5 w-5" />
                            Assigned Vehicles
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {geofence.vehicleIds && geofence.vehicleIds.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {geofence.vehicleIds.map((vehicleId) => (
                                    <Badge key={vehicleId} variant="secondary">
                                        Vehicle #{vehicleId}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground">No vehicles assigned</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Metadata */}
            <Card>
                <CardHeader>
                    <CardTitle>Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="font-medium">
                                {new Date(geofence.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Updated</p>
                            <p className="font-medium">
                                {new Date(geofence.updatedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
