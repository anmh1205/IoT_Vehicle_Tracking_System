/**
 * Responsive Container Component
 * Provides consistent responsive padding and max-width
 */
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface ResponsiveContainerProps {
    children: ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
};

export function ResponsiveContainer({
    children,
    className,
    size = 'xl',
}: ResponsiveContainerProps) {
    return (
        <div
            className={cn(
                'mx-auto w-full px-4 sm:px-6 lg:px-8',
                sizeClasses[size],
                className
            )}
        >
            {children}
        </div>
    );
}

/**
 * Responsive Grid Component
 * Auto-adjusts columns based on screen size
 */
interface ResponsiveGridProps {
    children: ReactNode;
    className?: string;
    cols?: {
        default?: number;
        sm?: number;
        md?: number;
        lg?: number;
        xl?: number;
    };
    gap?: 'sm' | 'md' | 'lg';
}

const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
};

export function ResponsiveGrid({
    children,
    className,
    cols = { default: 1, sm: 2, md: 3, lg: 4 },
    gap = 'md',
}: ResponsiveGridProps) {
    const colClasses = [
        cols.default && `grid-cols-${cols.default}`,
        cols.sm && `sm:grid-cols-${cols.sm}`,
        cols.md && `md:grid-cols-${cols.md}`,
        cols.lg && `lg:grid-cols-${cols.lg}`,
        cols.xl && `xl:grid-cols-${cols.xl}`,
    ].filter(Boolean).join(' ');

    return (
        <div className={cn('grid', colClasses, gapClasses[gap], className)}>
            {children}
        </div>
    );
}

/**
 * Hide on Mobile Component
 */
interface HideOnMobileProps {
    children: ReactNode;
    breakpoint?: 'sm' | 'md' | 'lg';
}

export function HideOnMobile({ children, breakpoint = 'md' }: HideOnMobileProps) {
    const classes = {
        sm: 'hidden sm:block',
        md: 'hidden md:block',
        lg: 'hidden lg:block',
    };

    return <div className={classes[breakpoint]}>{children}</div>;
}

/**
 * Show on Mobile Only Component
 */
interface ShowOnMobileProps {
    children: ReactNode;
    breakpoint?: 'sm' | 'md' | 'lg';
}

export function ShowOnMobile({ children, breakpoint = 'md' }: ShowOnMobileProps) {
    const classes = {
        sm: 'block sm:hidden',
        md: 'block md:hidden',
        lg: 'block lg:hidden',
    };

    return <div className={classes[breakpoint]}>{children}</div>;
}
