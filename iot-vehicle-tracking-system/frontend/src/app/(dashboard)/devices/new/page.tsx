/**
 * Create New Device Page
 */
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { DeviceForm } from '@/features/devices/components/device-form';

export default function NewDevicePage() {
    return (
        <PageContainer>
            <PageHeader
                title="Add New Device"
                description="Register a new tracking device"
            />
            <DeviceForm />
        </PageContainer>
    );
}
