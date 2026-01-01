/**
 * useCustomers Hook - Fetch customers list
 */
import { useQuery } from '@tanstack/react-query';
import { customerServices } from '@/lib/api/customers';
import { QUERY_KEYS } from '@/lib/constants/query-keys';
import { STALE_TIMES } from '@/lib/constants/query-cache';
import type { QueryCustomerDto } from '@/types';

export function useCustomers(params?: QueryCustomerDto, enabled: boolean = true) {
  return useQuery({
    queryKey: [...QUERY_KEYS.CUSTOMERS, params],
    queryFn: () => customerServices.list(params),
    enabled,
    staleTime: STALE_TIMES.CUSTOMER_LIST,
  });
}

export function useCustomer(id: number | string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.CUSTOMER(id!),
    queryFn: () => customerServices.getById(id!),
    enabled: !!id,
    staleTime: STALE_TIMES.CUSTOMER_LIST,
  });
}

