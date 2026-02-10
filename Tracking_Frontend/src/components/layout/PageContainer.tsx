import { ScrollArea } from '@/components/ui/scroll-area';

interface PageContainerProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageDescription?: string;
  pageHeaderAction?: React.ReactNode;
  scrollable?: boolean;
}

export function PageContainer({
  children,
  pageTitle,
  pageDescription,
  pageHeaderAction,
  scrollable = true,
}: PageContainerProps) {
  const content = (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {(pageTitle || pageHeaderAction) && (
        <div className="flex items-center justify-between">
          <div>
            {pageTitle && <h2 className="text-2xl font-bold tracking-tight">{pageTitle}</h2>}
            {pageDescription && <p className="text-muted-foreground">{pageDescription}</p>}
          </div>
          {pageHeaderAction}
        </div>
      )}
      {children}
    </div>
  );

  if (scrollable) {
    return <ScrollArea className="h-[calc(100vh-4rem)]">{content}</ScrollArea>;
  }
  return content;
}
