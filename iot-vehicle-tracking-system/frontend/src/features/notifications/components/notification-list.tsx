/**
 * Notification List Component
 */
'use client';

import { useNotifications } from '@/hooks/queries/use-notifications';
import { NotificationItem } from './notification-item';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell } from 'lucide-react';

export function NotificationList() {
    const { data, isLoading } = useNotifications();

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                ))}
            </div>
        );
    }

    if (!data?.data?.length) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No notifications</h3>
                <p className="text-sm text-muted-foreground">
                    You're all caught up! Check back later.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {data.data.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
            ))}
        </div>
    );
}
