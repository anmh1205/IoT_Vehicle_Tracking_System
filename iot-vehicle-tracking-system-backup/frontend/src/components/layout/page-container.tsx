import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PageContainerProps {
    children: React.ReactNode;
    scrollable?: boolean;
    className?: string;
}

export function PageContainer({ children, scrollable = true, className }: PageContainerProps) {
    if (scrollable) {
        return (
            <ScrollArea className='h-[calc(100vh-theme(spacing.16))]'>
                <div className={cn('h-full p-4 md:px-8', className)}>{children}</div>
            </ScrollArea>
        );
    }

    return <div className={cn('h-full p-4 md:px-8', className)}>{children}</div>;
}

interface HeadingProps {
    title: string;
    description?: string;
}

export function Heading({ title, description }: HeadingProps) {
    return (
        <div>
            <h2 className='text-3xl font-bold tracking-tight'>{title}</h2>
            {description && <p className='text-sm text-muted-foreground'>{description}</p>}
        </div>
    );
}
