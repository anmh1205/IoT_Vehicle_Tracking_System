"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export default function QueryProvider({
    children,
}: {
    children: React.ReactNode
}) {
    // Create new QueryClient instance for each render
    // This ensures no stale data between requests
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                // Data is considered fresh for 5 minutes
                staleTime: 5 * 60 * 1000, // 5 minutes

                // Data is cached for 10 minutes
                gcTime: 10 * 60 * 1000, // 10 minutes

                // Retry 3 times on failure
                retry: 3,

                // Auto refetch when window focus
                refetchOnWindowFocus: true,

                // Auto refetch when network reconnects
                refetchOnReconnect: true,

                // Don't refetch when component mounts again
                refetchOnMount: false,
            },
            mutations: {
                // Retry 1 time for mutations
                retry: 1,
            },
        },
    }))

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {/* React Query DevTools - only show in development */}
            {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools
                    initialIsOpen={false}
                    position="bottom"
                />
            )}
        </QueryClientProvider>
    )
}