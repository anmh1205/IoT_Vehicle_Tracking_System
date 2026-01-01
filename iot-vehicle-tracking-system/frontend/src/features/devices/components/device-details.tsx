/**
 * Device Details Component
 */
'use client';

import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Cpu, Signal, Battery, Clock, Car, Edit, Trash2 } from 'lucide-react';
import type { Device, DeviceStatus } from '@/types';
import { useDeleteDevice } from '@/hooks/mutations/use-device-mutations';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface DeviceDetailsProps {
    device: Device;
    onEdit?: () => void;
}

const statusColors: Record<DeviceStatus, string> = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    offline: 'bg-red-500',
    error: 'bg-red-600',
};

export function DeviceDetails({ device, onEdit }: DeviceDetailsProps) {
    const router = useRouter();
    const deleteMutation = useDeleteDevice();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (confirm('Are you sure you want to delete this device?')) {
            setIsDeleting(true);
            try {
                await deleteMutation.mutateAsync(device.id);
                router.push('/dashboard/devices');
            } finally {
                setIsDeleting(false);
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
                            <Cpu className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">{device.deviceId}</CardTitle>
                            <p className="text-muted-foreground">
                                {device.deviceType || 'Tracker'}
                            </p>
                        </div>
                    </div>
                    <Badge className={statusColors[device.status]}>
                        {device.status}
                    </Badge>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onEdit}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <Signal className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Signal</p>
                            <p className="text-2xl font-bold">
                                {device.signalStrength ?? '-'}%
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <Battery className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Battery</p>
                            <p className="text-2xl font-bold">
                                {device.batteryLevel ?? '-'}%
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <Clock className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Last Seen</p>
                            <p className="text-lg font-medium">
                                {device.lastSeen
                                    ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })
                                    : 'Never'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="flex items-center gap-4 pt-6">
                        <Car className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm text-muted-foreground">Vehicle</p>
                            <p className="text-lg font-medium">
                                {device.vehicleId ? `#${device.vehicleId}` : 'Not assigned'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Details Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Device Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">IMEI</p>
                                <p className="font-medium">{device.imei || '-'}</p>
                            </div>
                            <Separator />
                            <div>
                                <p className="text-sm text-muted-foreground">SIM Card</p>
                                <p className="font-medium">{device.simCardNumber || '-'}</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Firmware Version</p>
                                <p className="font-medium">{device.firmwareVersion || '-'}</p>
                            </div>
                            <Separator />
                            <div>
                                <p className="text-sm text-muted-foreground">Hardware Version</p>
                                <p className="font-medium">{device.hardwareVersion || '-'}</p>
                            </div>
                        </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="font-medium">
                                {new Date(device.createdAt).toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Updated</p>
                            <p className="font-medium">
                                {new Date(device.updatedAt).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
