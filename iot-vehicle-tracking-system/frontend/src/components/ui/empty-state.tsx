/**
 * Empty State Components
 */
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
    FileQuestion,
    Search,
    AlertCircle,
    Inbox,
    Users,
    Car,
    Bell,
    type LucideIcon
} from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon = FileQuestion,
    title,
    description,
    actionLabel,
    onAction,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn(
            'flex flex-col items-center justify-center py-12 px-4 text-center',
            className
        )}>
            <div className="rounded-full bg-muted p-4 mb-4">
                <Icon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
            )}
            {actionLabel && onAction && (
                <Button onClick={onAction}>{actionLabel}</Button>
            )}
        </div>
    );
}

// Pre-configured empty states for common scenarios
export function NoResultsFound({ searchTerm, onClear }: { searchTerm?: string; onClear?: () => void }) {
    return (
        <EmptyState
            icon={Search}
            title="No results found"
            description={searchTerm
                ? `No items match "${searchTerm}". Try adjusting your search.`
                : 'No items match your current filters.'}
            actionLabel={onClear ? 'Clear filters' : undefined}
            onAction={onClear}
        />
    );
}

export function NoVehicles({ onAdd }: { onAdd?: () => void }) {
    return (
        <EmptyState
            icon={Car}
            title="No vehicles yet"
            description="Get started by adding your first vehicle to the system."
            actionLabel={onAdd ? 'Add Vehicle' : undefined}
            onAction={onAdd}
        />
    );
}

export function NoCustomers({ onAdd }: { onAdd?: () => void }) {
    return (
        <EmptyState
            icon={Users}
            title="No customers yet"
            description="Start by registering your first customer."
            actionLabel={onAdd ? 'Add Customer' : undefined}
            onAction={onAdd}
        />
    );
}

export function NoNotifications() {
    return (
        <EmptyState
            icon={Bell}
            title="No notifications"
            description="You're all caught up! No new notifications at this time."
        />
    );
}

export function NoData({ message }: { message?: string }) {
    return (
        <EmptyState
            icon={Inbox}
            title="No data available"
            description={message || 'There is no data to display at this time.'}
        />
    );
}

export function ErrorState({
    message,
    onRetry
}: {
    message?: string;
    onRetry?: () => void;
}) {
    return (
        <EmptyState
            icon={AlertCircle}
            title="Something went wrong"
            description={message || 'An error occurred while loading data. Please try again.'}
            actionLabel={onRetry ? 'Retry' : undefined}
            onAction={onRetry}
        />
    );
}
