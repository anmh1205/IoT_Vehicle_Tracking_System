/**
 * Notifications Page
 */
import { PageContainer, PageHeader } from '@/components/layout/page-container';
import { NotificationList } from '@/features/notifications/components/notification-list';

export default function NotificationsPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Notifications"
                description="View and manage your notifications"
            />
            <NotificationList />
        </PageContainer>
    );
}
