/**
 * Device Details Page
 */
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { DeviceDetails } from '@/features/devices/components/device-details';
import { DeviceForm } from '@/features/devices/components/device-form';
import { useDevice } from '@/hooks/queries/use-devices';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface DevicePageProps {
    params: Promise<{ id: string }>;
}

export default function DevicePage({ params }: DevicePageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { data, isLoading, error } = useDevice(id);
    const [isEditing, setIsEditing] = useState(false);

    if (isLoading) {
        return (
            <PageContainer>
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="space-y-4">
                    <Skeleton className="h-40 w-full" />
                    <div className="grid gap-4 md:grid-cols-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-24" />
                        ))}
                    </div>
                </div>
            </PageContainer>
        );
    }

    if (error || !data?.data) {
        return (
            <PageContainer>
                <div className="flex flex-col items-center justify-center py-12">
                    <h2 className="text-xl font-semibold mb-2">Device not found</h2>
                    <p className="text-muted-foreground mb-4">
                        The device you're looking for doesn't exist.
                    </p>
                    <Button onClick={() => router.push('/dashboard/devices')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Devices
                    </Button>
                </div>
            </PageContainer>
        );
    }

    const device = data.data;

    if (isEditing) {
        return (
            <PageContainer>
                <PageHeader
                    title="Edit Device"
                    description={`Editing device ${device.deviceId}`}
                />
                <DeviceForm
                    device={device}
                    onSuccess={() => setIsEditing(false)}
                />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title={device.deviceId}
                description="Device details"
                action={
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                }
            />
            <DeviceDetails device={device} onEdit={() => setIsEditing(true)} />
        </PageContainer>
    );
}
