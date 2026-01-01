/**
 * Trip Details Component
 */
'use client';

import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Route, Clock, Gauge, MapPin, Car, User } from 'lucide-react';
import type { Trip, TripStatus } from '@/types';

interface TripDetailsProps {
    trip: Trip;
}

const statusColors: Record<TripStatus, string> = {
    active: 'bg-green-500',
    completed: 'bg-blue-500',
    cancelled: 'bg-gray-500',
};

function formatDuration(minutes?: number): string {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
        return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
}

export function TripDetails({ trip }: TripDetailsProps) {
    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-primary/10 p-3">
                            <Route className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">Trip #{trip.id}</CardTitle>
                            <p className="text-muted-foreground">
                                Started {format(new Date(trip.startTime), 'PPp')}
                            </p>
                        </div>
                    </div>
                    <Badge className={statusColors[trip.status]}>
                        {trip.status}
                    </Badge>
                </CardHeader>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <Car className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Vehicle</p>
                            <p className="text-2xl font-bold">#{trip.vehicleId}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Duration</p>
                            <p className="text-2xl font-bold">{formatDuration(trip.duration)}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <MapPin className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Distance</p>
                            <p className="text-2xl font-bold">
                                {trip.distance ? `${trip.distance.toFixed(1)} km` : '-'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <Gauge className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Avg Speed</p>
                            <p className="text-2xl font-bold">
                                {trip.avgSpeed ? `${trip.avgSpeed.toFixed(0)} km/h` : '-'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Trip Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Start Location */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-green-500">
                                <MapPin className="h-4 w-4" />
                                <span className="font-medium">Start Location</span>
                            </div>
                            {trip.startLocation ? (
                                <div className="pl-6">
                                    <p className="text-sm">
                                        {trip.startLocation.address ||
                                            `${trip.startLocation.latitude.toFixed(6)}, ${trip.startLocation.longitude.toFixed(6)}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(trip.startTime), 'PPp')}
                                    </p>
                                </div>
                            ) : (
                                <p className="pl-6 text-sm text-muted-foreground">No location data</p>
                            )}
                        </div>

                        {/* End Location */}
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-red-500">
                                <MapPin className="h-4 w-4" />
                                <span className="font-medium">End Location</span>
                            </div>
                            {trip.endLocation ? (
                                <div className="pl-6">
                                    <p className="text-sm">
                                        {trip.endLocation.address ||
                                            `${trip.endLocation.latitude.toFixed(6)}, ${trip.endLocation.longitude.toFixed(6)}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {trip.endTime ? format(new Date(trip.endTime), 'PPp') : '-'}
                                    </p>
                                </div>
                            ) : (
                                <p className="pl-6 text-sm text-muted-foreground">
                                    {trip.status === 'active' ? 'Trip in progress' : 'No location data'}
                                </p>
                            )}
                        </div>
                    </div>

                    <Separator className="my-6" />

                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <p className="text-sm text-muted-foreground">Max Speed</p>
                            <p className="font-medium">
                                {trip.maxSpeed ? `${trip.maxSpeed.toFixed(0)} km/h` : '-'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Driver</p>
                            <p className="font-medium">
                                {trip.driverId ? `#${trip.driverId}` : 'Not assigned'}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="font-medium">
                                {format(new Date(trip.createdAt), 'PP')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
