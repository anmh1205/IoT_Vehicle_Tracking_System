/**
 * Device Form Component
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
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { deviceSchema, type DeviceFormData } from '../schemas/device.schema';
import { useCreateDevice, useUpdateDevice } from '@/hooks/mutations/use-device-mutations';
import { useVehicles } from '@/hooks/queries/use-vehicles';
import type { Device, CreateDeviceDto, UpdateDeviceDto } from '@/types';
import { Loader2 } from 'lucide-react';

interface DeviceFormProps {
    device?: Device;
    onSuccess?: () => void;
}

export function DeviceForm({ device, onSuccess }: DeviceFormProps) {
    const router = useRouter();
    const createMutation = useCreateDevice();
    const updateMutation = useUpdateDevice();
    const { data: vehiclesData } = useVehicles();

    const form = useForm<DeviceFormData>({
        resolver: zodResolver(deviceSchema),
        defaultValues: device ? {
            deviceId: device.deviceId,
            deviceType: device.deviceType || 'tracker',
            firmwareVersion: device.firmwareVersion,
            hardwareVersion: device.hardwareVersion,
            imei: device.imei,
            simCardNumber: device.simCardNumber,
            status: device.status,
            vehicleId: device.vehicleId,
        } : {
            deviceId: '',
            deviceType: 'tracker',
            status: 'active',
        },
    });

    const onSubmit = async (data: DeviceFormData) => {
        try {
            if (device) {
                await updateMutation.mutateAsync({
                    id: device.id,
                    data: data as UpdateDeviceDto,
                });
            } else {
                await createMutation.mutateAsync(data as CreateDeviceDto);
            }
            onSuccess?.();
            if (!device) {
                router.push('/dashboard/devices');
            }
        } catch (error) {
            // Error handling is done in mutation hooks
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{device ? 'Edit Device' : 'Create Device'}</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="deviceId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Device ID *</FormLabel>
                                        <FormControl>
                                            <Input {...field} disabled={!!device} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="deviceType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Device Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="tracker">Tracker</SelectItem>
                                                <SelectItem value="obd">OBD</SelectItem>
                                                <SelectItem value="camera">Camera</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="imei"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>IMEI</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="simCardNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SIM Card Number</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="firmwareVersion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Firmware Version</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="hardwareVersion"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hardware Version</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">Active</SelectItem>
                                                <SelectItem value="inactive">Inactive</SelectItem>
                                                <SelectItem value="offline">Offline</SelectItem>
                                                <SelectItem value="error">Error</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="vehicleId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assigned Vehicle</FormLabel>
                                        <Select
                                            onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                                            value={field.value?.toString()}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select vehicle" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="">None</SelectItem>
                                                {vehiclesData?.data?.map((vehicle) => (
                                                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                                                        {vehicle.plateNumber} ({vehicle.vehicleId})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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
                                ) : device ? 'Update' : 'Create'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
