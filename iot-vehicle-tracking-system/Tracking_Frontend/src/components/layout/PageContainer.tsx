import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
interface PageContainerProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageDescription?: string;
  pageHeaderAction?: React.ReactNode;
  scrollable?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}
export const PageContainer = ({
  children,
  pageTitle,
  pageDescription,
  pageHeaderAction,
  scrollable = true,
  className,
  headerClassName,
  contentClassName,
}: PageContainerProps) => {
  const content = (
    <div
      className={cn(
        'mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 pb-6 pt-2 sm:px-6',
        contentClassName,
      )}
    >
      {(pageTitle || pageHeaderAction) && (
        <div
          className={cn(
            'flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between',
            headerClassName,
          )}
        >
          <div className="min-w-0">
            {pageTitle && <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>}
            {pageDescription && (
              <p className="mt-1 text-sm text-muted-foreground">{pageDescription}</p>
            )}
          </div>
          {pageHeaderAction ? <div className="shrink-0">{pageHeaderAction}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
  if (!scrollable) {
    return <div className={cn('flex flex-1 flex-col', className)}>{content}</div>;
  }
  return (
    <ScrollArea className={cn('h-[calc(100dvh-4rem)] w-full', className)}>{content}</ScrollArea>
  );
};
