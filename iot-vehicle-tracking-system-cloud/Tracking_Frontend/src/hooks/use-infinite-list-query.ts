import { useMemo } from 'react';
import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';

export interface InfiniteListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InfiniteListPage<TItem, TPayload> {
  payload: TPayload;
  items: TItem[];
  pagination: InfiniteListPagination;
}

interface UseInfiniteListQueryOptions<TItem, TPayload> {
  queryKey: QueryKey;
  pageSize: number;
  enabled?: boolean;
  queryFn: (params: { page: number; limit: number }) => Promise<TPayload>;
  selectItems?: (payload: TPayload) => TItem[];
}

export const extractInfiniteListItems = <TItem>(payload: any): TItem[] => {
  if (Array.isArray(payload?.items)) {
    return payload.items as TItem[];
  }
  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items as TItem[];
  }
  if (Array.isArray(payload?.notifications)) {
    return payload.notifications as TItem[];
  }
  if (Array.isArray(payload?.data?.notifications)) {
    return payload.data.notifications as TItem[];
  }
  if (Array.isArray(payload)) {
    return payload as TItem[];
  }
  return [];
};

export const extractInfiniteListPagination = (
  payload: any,
  fallbackPage: number,
  fallbackLimit: number,
  fallbackLength: number,
): InfiniteListPagination => {
  const pagination = payload?.pagination ?? payload?.data?.pagination ?? {};
  const page = Number(payload?.page ?? pagination.page ?? fallbackPage);
  const limit = Number(payload?.limit ?? pagination.limit ?? fallbackLimit);
  const total = Number(payload?.total ?? pagination.total ?? fallbackLength);
  const totalPages = Number(
    payload?.totalPages ??
      payload?.total_pages ??
      pagination.totalPages ??
      pagination.total_pages ??
      Math.max(Math.ceil(total / Math.max(limit, 1)), 1),
  );

  return {
    page: Number.isFinite(page) && page > 0 ? page : fallbackPage,
    limit: Number.isFinite(limit) && limit > 0 ? limit : fallbackLimit,
    total: Number.isFinite(total) && total >= 0 ? total : fallbackLength,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
  };
};

export const useInfiniteListQuery = <TItem, TPayload = any>({
  queryKey,
  pageSize,
  enabled = true,
  queryFn,
  selectItems = extractInfiniteListItems<TItem>,
}: UseInfiniteListQueryOptions<TItem, TPayload>) => {
  const query = useInfiniteQuery({
    queryKey: [...queryKey, pageSize],
    enabled,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const payload = await queryFn({ page: pageParam, limit: pageSize });
      const items = selectItems(payload);
      const pagination = extractInfiniteListPagination(payload, pageParam, pageSize, items.length);

      return {
        payload,
        items,
        pagination,
      } satisfies InfiniteListPage<TItem, TPayload>;
    },
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((sum, page) => sum + page.items.length, 0);
      if (loadedCount >= lastPage.pagination.total) {
        return undefined;
      }
      if (lastPage.pagination.page >= lastPage.pagination.totalPages) {
        return undefined;
      }
      return lastPage.pagination.page + 1;
    },
  });

  const items = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );
  const total = query.data?.pages[0]?.pagination.total ?? 0;
  const totalPages = query.data?.pages[0]?.pagination.totalPages ?? 1;
  const loadedPages = query.data?.pages.length ?? 0;
  const loadedCount = items.length;

  return {
    ...query,
    items,
    total,
    totalPages,
    loadedPages,
    loadedCount,
    hasMore: Boolean(query.hasNextPage),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
  };
};
