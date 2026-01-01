/**
 * Create New Geofence Page
 */
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { GeofenceForm } from '@/features/geofences/components/geofence-form';

export default function NewGeofencePage() {
    return (
        <PageContainer>
            <PageHeader
                title="Create Geofence"
                description="Define a new geographic boundary"
            />
            <GeofenceForm />
        </PageContainer>
    );
}
