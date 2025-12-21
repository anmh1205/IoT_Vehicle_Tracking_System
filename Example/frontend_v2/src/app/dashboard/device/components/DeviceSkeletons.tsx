'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CardGridSkeleton() {
  return (
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className='border'>
          <CardHeader className='space-y-2'>
            <div className='flex items-start justify-between gap-2'>
              <Skeleton className='h-5 w-28' />
              <Skeleton className='h-5 w-16' />
            </div>
            <Skeleton className='h-3 w-40' />
          </CardHeader>
          <CardContent className='space-y-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-1/2' />
          </CardContent>
          <CardFooter className='flex justify-between'>
            <Skeleton className='h-3 w-24' />
            <Skeleton className='h-8 w-8' />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div className='space-y-2'>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className='h-6 w-full' />
      ))}
    </div>
  );
}

