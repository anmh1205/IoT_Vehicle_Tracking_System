/**
 * Notification Dropdown Component
 * Shows recent notifications in the header
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/queries/use-notifications';
import { useMarkNotificationDelivered } from '@/hooks/mutations/use-notification-mutations';
import type { NotificationType } from '@/types';

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

export function NotificationDropdown() {
    const [open, setOpen] = useState(false);
    const { data, isLoading } = useNotifications({ limit: 5 });
    const markDelivered = useMarkNotificationDelivered();

    const notifications = data?.data || [];
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const handleMarkAsRead = (id: number) => {
        markDelivered.mutate(id);
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                            variant="destructive"
                        >
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Badge>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                            {unreadCount} new
                        </Badge>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {isLoading ? (
                    <div className="p-2 space-y-2">
                        {[...Array(3)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-6 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications</p>
                    </div>
                ) : (
                    <>
                        {notifications.map((notification) => {
                            const Icon = typeIcons[notification.type] || Bell;
                            const colorClass = typeColors[notification.type] || 'text-gray-500';

                            return (
                                <DropdownMenuItem
                                    key={notification.id}
                                    className="flex items-start gap-3 p-3 cursor-pointer"
                                    onClick={() => {
                                        if (!notification.isRead) {
                                            handleMarkAsRead(notification.id);
                                        }
                                    }}
                                >
                                    <Icon className={`h-4 w-4 mt-0.5 ${colorClass}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${notification.isRead ? 'text-muted-foreground' : ''}`}>
                                            {notification.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                        </p>
                                    </div>
                                    {!notification.isRead && (
                                        <div className="h-2 w-2 rounded-full bg-primary mt-1" />
                                    )}
                                </DropdownMenuItem>
                            );
                        })}
                    </>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="justify-center">
                    <Link href="/dashboard/notifications" className="w-full text-center text-sm">
                        View all notifications
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
