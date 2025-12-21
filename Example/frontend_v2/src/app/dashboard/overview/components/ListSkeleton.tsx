'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function ListSkeleton() {
  return (
    <div className='space-y-3 py-3'>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='flex items-start gap-3'>
          <Skeleton className='h-8 w-8 rounded-full' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-2/3' />
            <Skeleton className='h-3 w-1/3' />
          </div>
        </div>
      ))}
    </div>
  );
}

