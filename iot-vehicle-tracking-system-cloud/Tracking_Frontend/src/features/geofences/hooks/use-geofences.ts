import { useQuery } from '@tanstack/react-query';
import { geofenceServices } from '@/lib/api/geofences';

const PAGE_LIMIT = 100;
const MAX_PAGES = 20;

export const useGeofences = () =>
  useQuery({
    queryKey: ['map-geofences'],
    queryFn: async () => {
      const firstPayload = await geofenceServices.getList({ page: 1, limit: PAGE_LIMIT });
      const firstItems = firstPayload?.items ?? firstPayload?.data?.items ?? [];
      const firstPagination = firstPayload?.pagination ?? firstPayload?.data?.pagination;
      const totalPages = Math.max(
        Number(
          firstPagination?.totalPages ??
            Math.ceil(Number(firstPagination?.total ?? firstItems.length) / PAGE_LIMIT),
        ) || 1,
        1,
      );

      if (totalPages <= 1) {
        const normalized = {
          items: firstItems,
          pagination: firstPagination ?? {
            page: 1,
            limit: PAGE_LIMIT,
            total: firstItems.length,
            totalPages: 1,
          },
        };
        return {
          ...normalized,
          data: normalized,
        };
      }

      const pagePayloads = await Promise.all(
        Array.from(
          { length: Math.max(Math.min(totalPages, MAX_PAGES) - 1, 0) },
          (_, index) =>
            geofenceServices.getList({
              page: index + 2,
              limit: PAGE_LIMIT,
            }),
        ),
      );

      const mergedItems = [
        ...firstItems,
        ...pagePayloads.flatMap((payload) => payload?.items ?? payload?.data?.items ?? []),
      ];

      const normalized = {
        items: mergedItems,
        pagination: {
          page: 1,
          limit: PAGE_LIMIT,
          total: Number(firstPagination?.total ?? mergedItems.length),
          totalPages,
        },
      };

      return {
        ...normalized,
        data: normalized,
      };
    },
  });
