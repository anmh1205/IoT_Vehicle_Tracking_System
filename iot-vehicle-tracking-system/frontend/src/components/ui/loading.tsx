/**
 * Loading Spinner Component
 */
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
    return (
        <Loader2
            className={cn(
                'animate-spin text-muted-foreground',
                sizeClasses[size],
                className
            )}
        />
    );
}

interface LoadingPageProps {
    message?: string;
}

export function LoadingPage({ message = 'Loading...' }: LoadingPageProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-muted-foreground">{message}</p>
        </div>
    );
}

interface LoadingCardProps {
    rows?: number;
}

export function LoadingCard({ rows = 3 }: LoadingCardProps) {
    return (
        <div className="space-y-4 p-6 border rounded-lg">
            <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="h-4 bg-muted animate-pulse rounded" style={{ width: `${80 - i * 10}%` }} />
            ))}
        </div>
    );
}

interface LoadingTableProps {
    rows?: number;
    columns?: number;
}

export function LoadingTable({ rows = 5, columns = 4 }: LoadingTableProps) {
    return (
        <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid gap-4 p-4 bg-muted/50" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {[...Array(columns)].map((_, i) => (
                    <div key={i} className="h-4 bg-muted animate-pulse rounded" />
                ))}
            </div>
            {/* Rows */}
            {[...Array(rows)].map((_, rowIdx) => (
                <div
                    key={rowIdx}
                    className="grid gap-4 p-4 border-t"
                    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                >
                    {[...Array(columns)].map((_, colIdx) => (
                        <div key={colIdx} className="h-4 bg-muted animate-pulse rounded" />
                    ))}
                </div>
            ))}
        </div>
    );
}
