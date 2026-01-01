/**
 * Notification Item Component
 */
'use client';

import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, Info, CheckCircle, RefreshCw } from 'lucide-react';
import type { Notification, NotificationType } from '@/types';
import { useMarkNotificationDelivered, useRetryNotification } from '@/hooks/mutations/use-notification-mutations';

interface NotificationItemProps {
    notification: Notification;
}

const typeIcons: Record<NotificationType, React.ElementType> = {
    alert: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
    success: CheckCircle,
};

const typeColors: Record<NotificationType, string> = {
    alert: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
    success: 'text-green-500',
};

export function NotificationItem({ notification }: NotificationItemProps) {
    const markDelivered = useMarkNotificationDelivered();
    const retryNotification = useRetryNotification();

    const Icon = typeIcons[notification.type] || Bell;
    const colorClass = typeColors[notification.type] || 'text-gray-500';

    return (
        <Card className={notification.isRead ? 'opacity-60' : ''}>
            <CardContent className="flex items-start gap-4 p-4">
                <Icon className={`h-5 w-5 mt-0.5 ${colorClass}`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium truncate">{notification.title}</h4>
                        <Badge variant={notification.isRead ? 'secondary' : 'default'}>
                            {notification.isRead ? 'Read' : 'New'}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                        <div className="flex gap-2">
                            {!notification.isRead && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markDelivered.mutate(notification.id)}
                                    disabled={markDelivered.isPending}
                                >
                                    Mark as read
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => retryNotification.mutate(notification.id)}
                                disabled={retryNotification.isPending}
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
