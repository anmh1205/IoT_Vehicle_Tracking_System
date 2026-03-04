import { Skeleton } from '@/components/ui/skeleton';
export const DeviceDetailSkeleton = () => {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-1/3" />
      <div className="grid gap-3 md:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
};
export const DeviceCardSkeletonGrid = () => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-36 w-full" />
      ))}
    </div>
  );
};
