/**
 * Trip Details Page
 */
'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { TripDetails } from '@/features/trips/components/trip-details';
import { useTrip } from '@/hooks/queries/use-trips';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface TripPageProps {
    params: Promise<{ id: string }>;
}

export default function TripPage({ params }: TripPageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { data, isLoading, error } = useTrip(id);

    if (isLoading) {
        return (
            <PageContainer>
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
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
                    <h2 className="text-xl font-semibold mb-2">Trip not found</h2>
                    <p className="text-muted-foreground mb-4">
                        The trip you're looking for doesn't exist.
                    </p>
                    <Button onClick={() => router.push('/dashboard/trips')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Trips
                    </Button>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                title={`Trip #${id}`}
                description="Trip details and route"
                action={
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                }
            />
            <TripDetails trip={data.data} />
        </PageContainer>
    );
}
