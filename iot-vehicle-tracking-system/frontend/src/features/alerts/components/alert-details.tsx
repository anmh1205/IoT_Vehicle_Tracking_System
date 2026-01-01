/**
 * Alert Details Component
 */
'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Car, MapPin, Clock, User, CheckCircle } from 'lucide-react';
import type { Alert, AlertSeverity, AlertStatus } from '@/types';
import { useAcknowledgeAlert, useResolveAlert } from '@/hooks/mutations/use-alert-mutations';
import { useState } from 'react';

interface AlertDetailsProps {
    alert: Alert;
}

const severityColors: Record<AlertSeverity, string> = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500',
};

const statusColors: Record<AlertStatus, string> = {
    new: 'bg-red-500',
    acknowledged: 'bg-yellow-500',
    resolved: 'bg-green-500',
};

export function AlertDetails({ alert }: AlertDetailsProps) {
    const acknowledgeMutation = useAcknowledgeAlert();
    const resolveMutation = useResolveAlert();

    const handleAcknowledge = () => {
        acknowledgeMutation.mutate({ id: alert.id, data: {} });
    };

    const handleResolve = () => {
        const resolution = prompt('Enter resolution notes:');
        if (resolution) {
            resolveMutation.mutate({ id: alert.id, data: { resolution } });
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="rounded-full bg-red-100 p-3">
                            <AlertTriangle className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl capitalize">
                                {alert.type.replace('_', ' ')}
                            </CardTitle>
                            <p className="text-muted-foreground">Alert #{alert.id}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Badge className={severityColors[alert.severity]}>
                            {alert.severity}
                        </Badge>
                        <Badge className={statusColors[alert.status]}>
                            {alert.status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-lg mb-4">{alert.message}</p>
                    <div className="flex gap-2">
                        {alert.status === 'new' && (
                            <Button
                                onClick={handleAcknowledge}
                                disabled={acknowledgeMutation.isPending}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Acknowledge
                            </Button>
                        )}
                        {alert.status !== 'resolved' && (
                            <Button
                                variant="outline"
                                onClick={handleResolve}
                                disabled={resolveMutation.isPending}
                            >
                                Resolve
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <Car className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Vehicle</p>
                            <p className="text-2xl font-bold">#{alert.vehicleId}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="text-lg font-medium">
                                {format(new Date(alert.createdAt), 'PPp')}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {alert.location && (
                    <Card>
                        <CardContent className="flex items-center gap-4 pt-6">
                            <MapPin className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Location</p>
                                <p className="text-sm font-medium">
                                    {alert.location.latitude.toFixed(4)}, {alert.location.longitude.toFixed(4)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {alert.acknowledgedBy && (
                    <Card>
                        <CardContent className="flex items-center gap-4 pt-6">
                            <User className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">Acknowledged By</p>
                                <p className="text-lg font-medium">User #{alert.acknowledgedBy}</p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Timeline Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            <div>
                                <p className="font-medium">Alert Created</p>
                                <p className="text-sm text-muted-foreground">
                                    {format(new Date(alert.createdAt), 'PPpp')}
                                </p>
                            </div>
                        </div>

                        {alert.acknowledgedAt && (
                            <>
                                <Separator />
                                <div className="flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                    <div>
                                        <p className="font-medium">Acknowledged</p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(alert.acknowledgedAt), 'PPpp')}
                                            {alert.acknowledgedBy && ` by User #${alert.acknowledgedBy}`}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}

                        {alert.resolvedAt && (
                            <>
                                <Separator />
                                <div className="flex items-center gap-4">
                                    <div className="h-2 w-2 rounded-full bg-green-500" />
                                    <div>
                                        <p className="font-medium">Resolved</p>
                                        <p className="text-sm text-muted-foreground">
                                            {format(new Date(alert.resolvedAt), 'PPpp')}
                                            {alert.resolvedBy && ` by User #${alert.resolvedBy}`}
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
