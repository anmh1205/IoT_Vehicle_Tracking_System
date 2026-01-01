/**
 * Geofence Details Page
 */
'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { GeofenceDetails } from '@/features/geofences/components/geofence-details';
import { GeofenceForm } from '@/features/geofences/components/geofence-form';
import { useGeofence } from '@/hooks/queries/use-geofences';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface GeofencePageProps {
    params: Promise<{ id: string }>;
}

export default function GeofencePage({ params }: GeofencePageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { data, isLoading, error } = useGeofence(id);
    const [isEditing, setIsEditing] = useState(false);

    if (isLoading) {
        return (
            <PageContainer>
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="space-y-4">
                    <Skeleton className="h-40 w-full" />
                    <div className="grid gap-4 md:grid-cols-2">
                        <Skeleton className="h-48" />
                        <Skeleton className="h-48" />
                    </div>
                </div>
            </PageContainer>
        );
    }

    if (error || !data?.data) {
        return (
            <PageContainer>
                <div className="flex flex-col items-center justify-center py-12">
                    <h2 className="text-xl font-semibold mb-2">Geofence not found</h2>
                    <p className="text-muted-foreground mb-4">
                        The geofence you're looking for doesn't exist.
                    </p>
                    <Button onClick={() => router.push('/dashboard/geofences')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Geofences
                    </Button>
                </div>
            </PageContainer>
        );
    }

    const geofence = data.data;

    if (isEditing) {
        return (
            <PageContainer>
                <PageHeader
                    title="Edit Geofence"
                    description={`Editing ${geofence.name}`}
                />
                <GeofenceForm
                    geofence={geofence}
                    onSuccess={() => setIsEditing(false)}
                />
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title={geofence.name}
                description="Geofence details"
                action={
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                }
            />
            <GeofenceDetails geofence={geofence} onEdit={() => setIsEditing(true)} />
        </PageContainer>
    );
}
